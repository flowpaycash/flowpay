import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

// 🏛️ SOVEREIGN DATABASE PATH RESOLUTION
// Prioritize /app/data for Railway Volumes, fallback to local data dir
const getDatabasePaths = () => {
    const isRailway = process.env.RAILWAY_ENVIRONMENT || fs.existsSync("/app/data");
    const baseDir = isRailway ? "/app/data/flowpay" : path.join(process.cwd(), "data", "flowpay");

    return {
        DATA_DIR: baseDir,
        DB_PATH: path.join(baseDir, "flowpay.db"),
        // Schema is kept in the source for initialization
        SCHEMA_PATH: path.join(process.cwd(), "data", "flowpay", "schema.sql")
    };
};

const { DATA_DIR, DB_PATH, SCHEMA_PATH } = getDatabasePaths();

// Ensure data directory exists
try {
    if (!fs.existsSync(DATA_DIR)) {
        console.log(`[FlowPay DB] Creating directory: ${DATA_DIR}`);
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
} catch (err) {
    console.error(`[FlowPay DB] CRITICAL ERROR creating directory ${DATA_DIR}:`, err);
    // Fallback to current directory if /app/data fails
    const fallbackDir = path.join(process.cwd(), "data", "flowpay");
    console.log(`[FlowPay DB] Falling back to: ${fallbackDir}`);
    fs.mkdirSync(fallbackDir, { recursive: true });
}

// Initialize database
let db = null;

export function getDatabase() {
    if (!db) {
        try {
            console.log(`[FlowPay DB] Opening database at: ${DB_PATH}`);
            const newDb = new Database(DB_PATH);
            newDb.pragma("journal_mode = WAL");
            newDb.pragma("foreign_keys = ON");

            db = newDb;

            // Initialize schema if needed
            initializeSchema();
        } catch (err) {
            console.error(`[FlowPay DB] CRITICAL ERROR opening database:`, err);
            throw err;
        }
    }

    return db;
}

function initializeSchema() {
    if (!db) return;

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
        }
    }
}

export function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}

// ════════════════════════════════════════
// ORDER OPERATIONS
// ════════════════════════════════════════

export function createOrder(order) {
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
}

export function getOrder(charge_id) {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM orders WHERE charge_id = ?");
    return stmt.get(charge_id);
}

export function updateOrderStatus(charge_id, status, extra) {
    const db = getDatabase();

    let fields = ["status = ?", "updated_at = CURRENT_TIMESTAMP"];
    let values = [status];

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

    stmt.run(...values);
}

export function listOrdersPendingReview() {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM v_orders_pending_review");
    return stmt.all();
}

// ════════════════════════════════════════
// RECEIPT OPERATIONS
// ════════════════════════════════════════

export function createReceipt(receipt) {
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
}

export function getReceipt(receipt_id) {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM receipts WHERE receipt_id = ?");
    return stmt.get(receipt_id);
}

export function updateReceiptIPFS(receipt_id, ipfs_cid, ipfs_url) {
    const db = getDatabase();
    const stmt = db.prepare(`
    UPDATE receipts
    SET ipfs_cid = ?, ipfs_url = ?, pinned = 1, pinned_at = CURRENT_TIMESTAMP
    WHERE receipt_id = ?
  `);
    stmt.run(ipfs_cid, ipfs_url, receipt_id);
}

// ════════════════════════════════════════
// PRODUCT OPERATIONS
// ════════════════════════════════════════

export function getProduct(ref) {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM products WHERE ref = ? AND active = 1");
    return stmt.get(ref);
}

export function listProducts() {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM products WHERE active = 1 ORDER BY price_brl ASC");
    return stmt.all();
}

// ════════════════════════════════════════
// AUDIT LOG
// ════════════════════════════════════════

export function logAudit(event_type, actor, action, details, order_id) {
    const db = getDatabase();
    const stmt = db.prepare(`
    INSERT INTO audit_log (event_type, actor, action, details, order_id)
    VALUES (?, ?, ?, ?, ?)
  `);
    stmt.run(event_type, actor, action, details ? JSON.stringify(details) : null, order_id || null);
}
