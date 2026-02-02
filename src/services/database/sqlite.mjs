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
            } else {
                console.error(`[FlowPay DB] Schema file not found at ${SCHEMA_PATH}. Database might be empty!`);
                // Create minimal schema if file missing to prevent crash, or throw
                // throw new Error("Schema definition missing");
            }
        }
    } catch (error) {
        console.error("[FlowPay DB] Schema initialization failed:", error);
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
          metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        // Check if view exists or just query table directly to be safe
        const stmt = db.prepare("SELECT * FROM orders WHERE status = 'paid' OR status = 'processing'"); // Simple fallback if view unavailable
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

