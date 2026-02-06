import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import { createError, ERROR_TYPES } from "../api/error-handler.mjs";

// 🏛️ SOVEREIGN DATABASE PATH RESOLUTION
// Prioritize /app/data for Railway Volumes, fallback to local data dir
const getDatabasePaths = () => {
    // Validate that we are not traversing up directory incorrectly if ENV is compromised
    const isRailway = process.env.RAILWAY_ENVIRONMENT || (fs.existsSync("/app/data") && process.env.NODE_ENV === 'production');

    // Prevent directory traversal attacks if somehow baseDir is derived from input (not here, but good practice)
    let baseDir = isRailway ? "/app/data/flowpay" : path.join(process.cwd(), "data", "flowpay");

    return {
        DATA_DIR: baseDir,
        DB_PATH: path.join(baseDir, "flowpay.db"),
        // Schema is kept in the source for initialization
        SCHEMA_PATH: path.join(process.cwd(), "data", "flowpay", "schema.sql")
    };
};

const { DATA_DIR, DB_PATH, SCHEMA_PATH } = getDatabasePaths();

// Ensure data directory exists with secure permissions
try {
    if (!fs.existsSync(DATA_DIR)) {
        console.log(`[FlowPay DB] Creating directory: ${DATA_DIR}`);
        fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 }); // Private directory (rwx------)
    }
} catch (err) {
    console.error(`[FlowPay DB] CRITICAL ERROR creating directory ${DATA_DIR}:`, err);
    // Fallback to current directory if /app/data fails - but only in dev
    if (process.env.NODE_ENV !== 'production') {
        const fallbackDir = path.join(process.cwd(), "data", "flowpay");
        console.log(`[FlowPay DB] Falling back to: ${fallbackDir}`);
        fs.mkdirSync(fallbackDir, { recursive: true });
    } else {
        // In production, we must fail if we can't write to secure storage
        throw new Error(`Failed to initialize secure storage at ${DATA_DIR}`);
    }
}

// Initialize database
let db = null;

export function getDatabase() {
    if (!db) {
        try {
            console.log(`[FlowPay DB] Opening database at: ${DB_PATH}`);
            const newDb = new Database(DB_PATH, { timeout: 5000 }); // 5s timeout for locking
            newDb.pragma("journal_mode = WAL");
            newDb.pragma("foreign_keys = ON");
            newDb.pragma("synchronous = NORMAL"); // Balance durability/speed for WAL

            db = newDb;

            // Initialize schema if needed
            initializeSchema();
        } catch (err) {
            console.error(`[FlowPay DB] CRITICAL ERROR opening database:`, err);
            throw createError(ERROR_TYPES.INTERNAL_ERROR, "Failed to connect to database system", { error: err.message });
        }
    }

    return db;
}

function initializeSchema() {
    if (!db) return;

    try {
        // Check if schema is initialized
        const tables = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'")
            .all();

        if (tables.length === 0) {
            console.log("[FlowPay DB] Initializing schema...");
            if (fs.existsSync(SCHEMA_PATH)) {
                const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
                db.exec(schema);
                console.log("[FlowPay DB] Schema initialized from file ✓");
            }
        }

        // 🚀 AUTOMATIC MIGRATION: Ensure bridge columns exist
        const columns = db.prepare("PRAGMA table_info(orders)").all();
        const columnNames = columns.map(c => c.name);

        if (!columnNames.includes('bridge_status')) {
            console.log("[FlowPay DB] Migrating: Adding bridge_status...");
            db.prepare("ALTER TABLE orders ADD COLUMN bridge_status TEXT DEFAULT 'PENDING'").run();
        }
        if (!columnNames.includes('bridge_attempts')) {
            console.log("[FlowPay DB] Migrating: Adding bridge_attempts...");
            db.prepare("ALTER TABLE orders ADD COLUMN bridge_attempts INTEGER DEFAULT 0").run();
        }
        if (!columnNames.includes('bridge_last_error')) {
            console.log("[FlowPay DB] Migrating: Adding bridge_last_error...");
            db.prepare("ALTER TABLE orders ADD COLUMN bridge_last_error TEXT").run();
        }

        // 🚀 POE MIGRATION
        if (!columnNames.includes('poe_batch_id')) {
            console.log("[FlowPay DB] Migrating: Adding poe_batch_id...");
            db.prepare("ALTER TABLE orders ADD COLUMN poe_batch_id INTEGER").run();
        }

        const poeTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='poe_batches'").get();
        if (!poeTable) {
            console.log("[FlowPay DB] Migrating: Creating poe_batches table...");
            db.exec(`
                CREATE TABLE IF NOT EXISTS poe_batches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    merkle_root TEXT NOT NULL,
                    batch_size INTEGER NOT NULL,
                    anchor_tx_hash TEXT,
                    network TEXT DEFAULT 'base',
                    checkpoint_hash TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    anchored_at TIMESTAMP,
                    metadata TEXT
                )
            `);
            db.exec("CREATE INDEX idx_poe_batches_root ON poe_batches(merkle_root)");
        }

        // 🚀 AUTH MIGRATION: Magic Link Tokens
        const authTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='auth_tokens'").get();
        if (!authTable) {
            console.log("[FlowPay DB] Migrating: Creating auth_tokens table...");
            db.exec(`
                CREATE TABLE IF NOT EXISTS auth_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    token TEXT NOT NULL UNIQUE,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    used BOOLEAN DEFAULT 0
                )
            `);
            db.exec("CREATE INDEX idx_auth_tokens_token ON auth_tokens(token)");
            db.exec("CREATE INDEX idx_auth_tokens_email ON auth_tokens(email)");
        }

        // 🚀 SIWE MIGRATION: Nonces + Wallet Sessions
        const siweNoncesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='siwe_nonces'").get();
        if (!siweNoncesTable) {
            console.log("[FlowPay DB] Migrating: Creating siwe_nonces table...");
            db.exec(`
                CREATE TABLE IF NOT EXISTS siwe_nonces (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nonce TEXT NOT NULL UNIQUE,
                    expires_at TIMESTAMP NOT NULL,
                    used BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            db.exec("CREATE INDEX idx_siwe_nonces_nonce ON siwe_nonces(nonce)");
        }

        const walletSessionsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='wallet_sessions'").get();
        if (!walletSessionsTable) {
            console.log("[FlowPay DB] Migrating: Creating wallet_sessions table...");
            db.exec(`
                CREATE TABLE IF NOT EXISTS wallet_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    address TEXT NOT NULL,
                    chain_id INTEGER NOT NULL DEFAULT 1,
                    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    login_count INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            db.exec("CREATE UNIQUE INDEX idx_wallet_sessions_address ON wallet_sessions(address)");
        }

    } catch (error) {
        console.error("[FlowPay DB] Schema initialization/migration failed:", error);
        throw error;
    }
}

export function closeDatabase() {
    if (db) {
        try {
            db.close();
        } catch (e) {
            console.error("Error closing database", e);
        }
        db = null;
    }
}

// Wrapper for DB operations to handle errors uniformly
function dbOp(operation) {
    try {
        return operation();
    } catch (err) {
        // Check for specific SQLite errors
        if (err.code === 'SQLITE_CONSTRAINT') {
            throw createError(ERROR_TYPES.VALIDATION_ERROR, "Database constraint violation", { detail: err.message });
        }
        if (err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_LOCKED') {
            throw createError(ERROR_TYPES.INTERNAL_ERROR, "Database is busy, please try again", { detail: err.message });
        }
        console.error("Database operation failed:", err);
        throw createError(ERROR_TYPES.INTERNAL_ERROR, "Database operation failed", { originalError: err.message });
    }
}

// ════════════════════════════════════════
// ORDER OPERATIONS
// ════════════════════════════════════════

export function createOrder(order) {
    return dbOp(() => {
        const db = getDatabase();

        const stmt = db.prepare(`
        INSERT INTO orders (
          charge_id, amount_brl, amount_usdt, exchange_rate,
          product_ref, product_name, product_price,
          customer_ref, customer_wallet, customer_metadata,
          status, pix_qr, pix_copy_paste, checkout_url,
          metadata, bridge_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

        const result = stmt.run(
            order.charge_id,
            order.amount_brl,
            order.amount_usdt || null,
            order.exchange_rate || null,
            order.product_ref,
            order.product_name || null,
            order.product_price || null,
            order.customer_ref,
            order.customer_wallet || null,
            order.customer_metadata || null,
            order.status,
            order.pix_qr || null,
            order.pix_copy_paste || null,
            order.checkout_url || null,
            order.metadata || null,
            order.bridge_status || 'PENDING'
        );

        return result.lastInsertRowid;
    });
}

export function getOrder(charge_id) {
    return dbOp(() => {
        const db = getDatabase();
        const stmt = db.prepare("SELECT * FROM orders WHERE charge_id = ?");
        return stmt.get(charge_id);
    });
}

export function updateOrderStatus(charge_id, status, extra) {
    return dbOp(() => {
        const db = getDatabase();

        // Whitelist safe fields for dynamic query construction
        let fields = ["status = ?", "updated_at = CURRENT_TIMESTAMP"];
        let values = [status];

        // Safe logic: We control the keys pushed to 'fields' strictly.
        // No user input usually reaches 'extra' keys directly, but explicit checking is best.
        if (extra) {
            if (extra.paid_at) {
                fields.push("paid_at = ?");
                values.push(extra.paid_at);
            }
            if (extra.reviewed_at) {
                fields.push("reviewed_at = ?", "reviewed_by = ?");
                values.push(extra.reviewed_at, extra.reviewed_by);
            }
            if (extra.settled_at) {
                fields.push("settled_at = ?", "tx_hash = ?", "network = ?");
                values.push(extra.settled_at, extra.tx_hash, extra.network);
            }
            if (extra.receipt_cid) {
                fields.push("receipt_cid = ?", "receipt_ipfs_url = ?");
                values.push(extra.receipt_cid, extra.receipt_ipfs_url);
            }
            if (extra.bridge_status) {
                fields.push("bridge_status = ?");
                values.push(extra.bridge_status);
            }
            if (extra.bridge_attempts !== undefined) {
                fields.push("bridge_attempts = ?");
                values.push(extra.bridge_attempts);
            }
            if (extra.bridge_last_error !== undefined) {
                fields.push("bridge_last_error = ?");
                values.push(extra.bridge_last_error);
            }
        }

        values.push(charge_id);

        const stmt = db.prepare(`
        UPDATE orders 
        SET ${fields.join(", ")}
        WHERE charge_id = ?
      `);

        const info = stmt.run(...values);
        if (info.changes === 0) {
            console.warn(`[DB] Order update passed but no rows changed for charge_id: ${charge_id}`);
        }
    });
}

export function listOrdersPendingReview() {
    return dbOp(() => {
        const db = getDatabase();
        const stmt = db.prepare("SELECT * FROM orders WHERE status IN ('PIX_PAID', 'PENDING_REVIEW') ORDER BY created_at DESC");
        return stmt.all();
    });
}

// ════════════════════════════════════════
// RECEIPT OPERATIONS
// ════════════════════════════════════════

export function createReceipt(receipt) {
    return dbOp(() => {
        const db = getDatabase();

        const stmt = db.prepare(`
        INSERT INTO receipts (
          receipt_id, order_id, charge_id, paid_at,
          customer_ref, product_ref, amount_brl,
          permissions, access_url, unlock_token,
          issuer, signature, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

        const result = stmt.run(
            receipt.receipt_id,
            receipt.order_id,
            receipt.charge_id,
            receipt.paid_at,
            receipt.customer_ref,
            receipt.product_ref,
            receipt.amount_brl,
            receipt.permissions,
            receipt.access_url || null,
            receipt.unlock_token,
            receipt.issuer,
            receipt.signature,
            receipt.metadata || null,
        );

        return result.lastInsertRowid;
    });
}

export function getReceipt(receipt_id) {
    return dbOp(() => {
        const db = getDatabase();
        const stmt = db.prepare("SELECT * FROM receipts WHERE receipt_id = ?");
        return stmt.get(receipt_id);
    });
}

export function updateReceiptIPFS(receipt_id, ipfs_cid, ipfs_url) {
    return dbOp(() => {
        const db = getDatabase();
        const stmt = db.prepare(`
        UPDATE receipts
        SET ipfs_cid = ?, ipfs_url = ?, pinned = 1, pinned_at = CURRENT_TIMESTAMP
        WHERE receipt_id = ?
      `);
        stmt.run(ipfs_cid, ipfs_url, receipt_id);
    });
}

// ════════════════════════════════════════
// PRODUCT OPERATIONS
// ════════════════════════════════════════

export function getProduct(ref) {
    return dbOp(() => {
        const db = getDatabase();
        const stmt = db.prepare("SELECT * FROM products WHERE ref = ? AND active = 1");
        return stmt.get(ref);
    });
}

export function listProducts() {
    return dbOp(() => {
        const db = getDatabase();
        const stmt = db.prepare("SELECT * FROM products WHERE active = 1 ORDER BY price_brl ASC");
        return stmt.all();
    });
}

// ════════════════════════════════════════
// AUDIT LOG
// ════════════════════════════════════════

export function logAudit(event_type, actor, action, details, order_id) {
    try {
        const db = getDatabase();
        const stmt = db.prepare(`
        INSERT INTO audit_log (event_type, actor, action, details, order_id)
        VALUES (?, ?, ?, ?, ?)
      `);
        // Ensure details is stringified safely
        const safeDetails = details ? JSON.stringify(details) : null;
        stmt.run(event_type, actor, action, safeDetails, order_id || null);
    } catch (e) {
        // Audit log failure should NOT crash the app, but we should log it to stdout
        console.error("FAILED TO WRITE AUDIT LOG:", e);
    }
}

// ════════════════════════════════════════
// AUTH OPERATIONS
// ════════════════════════════════════════

export function saveAuthToken(email, token, expiresAt) {
    return dbOp(() => {
        const db = getDatabase();
        const stmt = db.prepare(`
            INSERT INTO auth_tokens (email, token, expires_at)
            VALUES (?, ?, ?)
        `);
        return stmt.run(email, token, expiresAt.toISOString());
    });
}

export function verifyAuthToken(token) {
    return dbOp(() => {
        const db = getDatabase();
        const stmt = db.prepare(`
            SELECT * FROM auth_tokens
            WHERE token = ? AND used = 0 AND expires_at > CURRENT_TIMESTAMP
        `);
        const authToken = stmt.get(token);

        if (authToken) {
            // Mark as used
            db.prepare("UPDATE auth_tokens SET used = 1 WHERE id = ?").run(authToken.id);
        }

        return authToken;
    });
}

// Cleanup expired/used auth tokens to prevent table bloat
export function cleanupExpiredAuthTokens() {
    try {
        const db = getDatabase();
        const result = db.prepare(`
            DELETE FROM auth_tokens
            WHERE used = 1 OR expires_at < datetime('now', '-1 hour')
        `).run();
        if (result.changes > 0) {
            console.log(`[FlowPay DB] Cleaned up ${result.changes} expired auth tokens`);
        }
    } catch (e) {
        console.error('[FlowPay DB] Auth token cleanup failed:', e.message);
    }
}

// Run cleanup every 30 minutes
setInterval(cleanupExpiredAuthTokens, 30 * 60 * 1000).unref();

// ════════════════════════════════════════
// SIWE OPERATIONS
// ════════════════════════════════════════

export function saveSiweNonce(nonce, expiresAt) {
    return dbOp(() => {
        const db = getDatabase();
        db.prepare(`INSERT INTO siwe_nonces (nonce, expires_at) VALUES (?, ?)`).run(nonce, expiresAt.toISOString());
    });
}

export function consumeSiweNonce(nonce) {
    return dbOp(() => {
        const db = getDatabase();
        const row = db.prepare(`SELECT * FROM siwe_nonces WHERE nonce = ? AND used = 0 AND expires_at > CURRENT_TIMESTAMP`).get(nonce);
        if (row) {
            db.prepare("UPDATE siwe_nonces SET used = 1 WHERE id = ?").run(row.id);
        }
        return row;
    });
}

export function upsertWalletSession(address, chainId) {
    return dbOp(() => {
        const db = getDatabase();
        const existing = db.prepare("SELECT * FROM wallet_sessions WHERE address = ?").get(address.toLowerCase());
        if (existing) {
            db.prepare(`UPDATE wallet_sessions SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1, chain_id = ? WHERE address = ?`)
                .run(chainId, address.toLowerCase());
        } else {
            db.prepare(`INSERT INTO wallet_sessions (address, chain_id) VALUES (?, ?)`)
                .run(address.toLowerCase(), chainId);
        }
    });
}

