-- FlowPay SQLite Schema
-- NEØ Protocol · Sovereign Local Database
-- No cloud, no centralization, full control

-- ════════════════════════════════════════
-- ORDERS TABLE
-- ════════════════════════════════════════

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Payment info
  charge_id TEXT NOT NULL UNIQUE,
  amount_brl REAL NOT NULL,
  amount_usdt REAL,
  exchange_rate REAL,
  
  -- Product info
  product_ref TEXT NOT NULL,
  product_name TEXT,
  product_price REAL,
  
  -- Customer info
  customer_ref TEXT NOT NULL,
  customer_wallet TEXT,
  customer_metadata TEXT, -- JSON
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'CREATED',
  -- CREATED → PIX_PAID → PENDING_REVIEW → APPROVED → SETTLED → COMPLETED
  -- Or: CREATED → PIX_PAID → REJECTED → REFUNDED
  
  -- Payment tracking
  pix_qr TEXT,
  pix_copy_paste TEXT,
  checkout_url TEXT,
  paid_at TIMESTAMP,
  
  -- Settlement tracking
  reviewed_at TIMESTAMP,
  reviewed_by TEXT,
  settled_at TIMESTAMP,
  tx_hash TEXT,
  network TEXT,
  
  -- IPFS anchoring
  receipt_cid TEXT,
  receipt_ipfs_url TEXT,
  
  -- Bridge tracking
  bridge_status TEXT DEFAULT 'PENDING', -- PENDING, SENT, FAILED
  bridge_attempts INTEGER DEFAULT 0,
  bridge_last_error TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT, -- JSON for extra data
  
  -- Indexes
  FOREIGN KEY (product_ref) REFERENCES products(ref)
);

CREATE INDEX idx_orders_charge_id ON orders(charge_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_ref ON orders(customer_ref);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- ════════════════════════════════════════
-- RECEIPTS TABLE
-- ════════════════════════════════════════

CREATE TABLE IF NOT EXISTS receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Receipt identification
  receipt_id TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL,
  
  -- UNLOCK_RECEIPT fields
  charge_id TEXT NOT NULL,
  paid_at TIMESTAMP NOT NULL,
  customer_ref TEXT NOT NULL,
  product_ref TEXT NOT NULL,
  amount_brl REAL NOT NULL,
  
  -- Access control
  permissions TEXT NOT NULL, -- JSON array
  access_url TEXT,
  unlock_token TEXT NOT NULL, -- JWT
  
  -- Signature & verification
  issuer TEXT NOT NULL DEFAULT 'Neobot',
  signature TEXT NOT NULL,
  
  -- IPFS storage
  ipfs_cid TEXT,
  ipfs_url TEXT,
  pinned BOOLEAN DEFAULT 0,
  pinned_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT, -- JSON
  
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX idx_receipts_receipt_id ON receipts(receipt_id);
CREATE INDEX idx_receipts_order_id ON receipts(order_id);
CREATE INDEX idx_receipts_charge_id ON receipts(charge_id);

-- ════════════════════════════════════════
-- PRODUCTS TABLE
-- ════════════════════════════════════════

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Product identification
  ref TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Pricing
  price_brl REAL NOT NULL,
  currency TEXT DEFAULT 'BRL',
  
  -- Access control
  permissions TEXT NOT NULL, -- JSON array
  access_url TEXT,
  access_duration_days INTEGER DEFAULT 365, -- null = lifetime
  
  -- Metadata
  active BOOLEAN DEFAULT 1,
  category TEXT,
  tags TEXT, -- JSON array
  image_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT -- JSON
);

CREATE INDEX idx_products_ref ON products(ref);
CREATE INDEX idx_products_active ON products(active);

-- ════════════════════════════════════════
-- RETRY QUEUE TABLE
-- ════════════════════════════════════════

CREATE TABLE IF NOT EXISTS retry_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Task info
  order_id INTEGER NOT NULL,
  task_type TEXT NOT NULL, -- 'settle', 'ipfs_pin', 'webhook'
  
  -- Retry logic
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  status TEXT DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
  
  -- Error tracking
  last_error TEXT,
  last_attempt_at TIMESTAMP,
  
  -- Scheduling
  next_retry_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX idx_retry_queue_status ON retry_queue(status);
CREATE INDEX idx_retry_queue_next_retry ON retry_queue(next_retry_at);

-- ════════════════════════════════════════
-- AUDIT LOG TABLE
-- ════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Event info
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL, -- user, system, admin
  
  -- Related entities
  order_id INTEGER,
  receipt_id TEXT,
  
  -- Event data
  action TEXT NOT NULL,
  details TEXT, -- JSON
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ════════════════════════════════════════
-- SEED DATA (Initial Products)
-- ════════════════════════════════════════

INSERT INTO products (ref, name, description, price_brl, permissions, category) VALUES
  ('basic_pass', 'NEØ Basic Access', 'Acesso básico ao ecossistema FlowPay. Inclui 1 wallet monitorada.', 49.90, 
   '["read:dashboard", "use:basic_agent"]', 
   'access'),
   
  ('pro_agent', 'NEØ Pro Agent', 'Poder total de automação. Inclui Neobot Pro e 5 wallets monitoradas.', 149.90,
   '["read:dashboard", "write:agents", "api:access", "use:pro_agent"]',
   'automation'),
   
  ('enterprise_protocol', 'NEØ Enterprise', 'Acesso root ao protocolo. Suporte prioritário e governança ilimitada.', 499.90,
   '["root", "governance:vote", "api:unlimited", "use:custom_agent"]',
   'protocol'),
   
  ('dev_sdk', 'Developer SDK Pass', 'Acesso antecipado a novas features e SDK para desenvolvimento de agents.', 249.90,
   '["read:dashboard", "api:dev", "sdk:use"]',
   'development');

-- ════════════════════════════════════════
-- VIEWS (Helper queries)
-- ════════════════════════════════════════

-- Orders pending review
CREATE VIEW IF NOT EXISTS v_orders_pending_review AS
SELECT 
  o.*,
  p.name as product_name,
  p.permissions as product_permissions
FROM orders o
LEFT JOIN products p ON o.product_ref = p.ref
WHERE o.status = 'PENDING_REVIEW'
ORDER BY o.paid_at ASC;

-- Recent orders (last 7 days)
CREATE VIEW IF NOT EXISTS v_orders_recent AS
SELECT 
  o.*,
  p.name as product_name,
  r.receipt_id,
  r.ipfs_cid
FROM orders o
LEFT JOIN products p ON o.product_ref = p.ref
LEFT JOIN receipts r ON o.id = r.order_id
WHERE o.created_at >= datetime('now', '-7 days')
ORDER BY o.created_at DESC;

-- Retry queue active
CREATE VIEW IF NOT EXISTS v_retry_queue_active AS
SELECT *
FROM retry_queue
WHERE status IN ('PENDING', 'PROCESSING')
  AND attempts < max_attempts
  AND (next_retry_at IS NULL OR next_retry_at <= datetime('now'))
ORDER BY created_at ASC;
