-- ════════════════════════════════════════════════════════════════
-- FLOWPAY · Database Migration 001
-- Target: Neon PostgreSQL (production-grade)
-- Source: SQLite (Railway Volume)
-- Author: NΞØ Protocol
-- ════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────
-- ORDERS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id                SERIAL PRIMARY KEY,
    charge_id         TEXT        NOT NULL UNIQUE,
    amount_brl        REAL        NOT NULL,
    amount_usdt       REAL,
    exchange_rate     REAL,
    product_ref       TEXT,
    product_name      TEXT,
    product_price     REAL,
    customer_ref      TEXT,
    customer_wallet   TEXT,
    customer_cpf      TEXT,
    customer_email    TEXT,
    customer_name     TEXT,
    customer_metadata TEXT,
    status            TEXT        NOT NULL DEFAULT 'CREATED',
    pix_qr            TEXT,
    pix_copy_paste    TEXT,
    checkout_url      TEXT,
    metadata          TEXT,
    bridge_status     TEXT        NOT NULL DEFAULT 'PENDING',
    bridge_attempts   INTEGER     NOT NULL DEFAULT 0,
    bridge_last_error TEXT,
    poe_batch_id      INTEGER,
    tx_hash           TEXT,
    network           TEXT,
    receipt_cid       TEXT,
    receipt_ipfs_url  TEXT,
    paid_at           TIMESTAMPTZ,
    reviewed_at       TIMESTAMPTZ,
    reviewed_by       TEXT,
    settled_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_charge_id    ON orders(charge_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_bridge_status ON orders(bridge_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON orders(created_at DESC);

-- ────────────────────────────────────────
-- RECEIPTS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipts (
    id             SERIAL PRIMARY KEY,
    receipt_id     TEXT        NOT NULL UNIQUE,
    order_id       INTEGER     REFERENCES orders(id),
    charge_id      TEXT        NOT NULL,
    paid_at        TIMESTAMPTZ,
    customer_ref   TEXT,
    product_ref    TEXT,
    amount_brl     REAL,
    permissions    TEXT,
    access_url     TEXT,
    unlock_token   TEXT,
    issuer         TEXT,
    signature      TEXT,
    metadata       TEXT,
    ipfs_cid       TEXT,
    ipfs_url       TEXT,
    pinned         BOOLEAN     NOT NULL DEFAULT FALSE,
    pinned_at      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_receipt_id ON receipts(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipts_charge_id  ON receipts(charge_id);

-- ────────────────────────────────────────
-- PRODUCTS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id           SERIAL PRIMARY KEY,
    ref          TEXT        NOT NULL UNIQUE,
    name         TEXT        NOT NULL,
    description  TEXT,
    price_brl    REAL        NOT NULL,
    currency     TEXT        NOT NULL DEFAULT 'BRL',
    active       BOOLEAN     NOT NULL DEFAULT TRUE,
    metadata     TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_ref ON products(ref);

-- ────────────────────────────────────────
-- AUDIT LOG
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id          SERIAL PRIMARY KEY,
    event_type  TEXT        NOT NULL,
    actor       TEXT,
    action      TEXT,
    details     TEXT,
    order_id    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ────────────────────────────────────────
-- AUTH TOKENS (magic link)
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_tokens (
    id         SERIAL PRIMARY KEY,
    email      TEXT        NOT NULL,
    token      TEXT        NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX        IF NOT EXISTS idx_auth_tokens_email ON auth_tokens(email);

-- ────────────────────────────────────────
-- USERS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id               SERIAL PRIMARY KEY,
    name             TEXT        NOT NULL,
    email            TEXT        NOT NULL UNIQUE,
    cpf              TEXT,
    document_type    TEXT        NOT NULL DEFAULT 'CPF',
    phone            TEXT,
    business_type    TEXT,
    status           TEXT        NOT NULL DEFAULT 'PENDING_APPROVAL',
    -- PENDING_APPROVAL | APPROVED | REJECTED
    approved_at      TIMESTAMPTZ,
    approved_by      TEXT,
    rejected_reason  TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX        IF NOT EXISTS idx_users_status ON users(status);

-- ────────────────────────────────────────
-- PAYMENT BUTTONS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_buttons (
    id               SERIAL PRIMARY KEY,
    button_id        TEXT        NOT NULL UNIQUE,
    user_id          INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title            TEXT        NOT NULL,
    description      TEXT,
    amount_brl       REAL,
    amount_fixed     BOOLEAN     NOT NULL DEFAULT TRUE,
    payment_methods  TEXT        NOT NULL DEFAULT '["pix","crypto"]',
    -- JSON array
    crypto_address   TEXT,
    crypto_network   TEXT        NOT NULL DEFAULT 'polygon',
    active           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_buttons_id   ON payment_buttons(button_id);
CREATE INDEX        IF NOT EXISTS idx_payment_buttons_user ON payment_buttons(user_id);

-- ────────────────────────────────────────
-- POE BATCHES (Proof of Existence)
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS poe_batches (
    id               SERIAL PRIMARY KEY,
    merkle_root      TEXT        NOT NULL,
    batch_size       INTEGER     NOT NULL,
    anchor_tx_hash   TEXT,
    network          TEXT        NOT NULL DEFAULT 'base',
    checkpoint_hash  TEXT,
    metadata         TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    anchored_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_poe_batches_root ON poe_batches(merkle_root);

-- ────────────────────────────────────────
-- SIWE (Sign-In With Ethereum)
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siwe_nonces (
    id         SERIAL PRIMARY KEY,
    nonce      TEXT        NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_siwe_nonces_nonce ON siwe_nonces(nonce);

CREATE TABLE IF NOT EXISTS wallet_sessions (
    id          SERIAL PRIMARY KEY,
    address     TEXT        NOT NULL UNIQUE,
    chain_id    INTEGER     NOT NULL DEFAULT 1,
    last_login  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    login_count INTEGER     NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_sessions_address ON wallet_sessions(address);

-- ────────────────────────────────────────
-- TRIGGER: updated_at automático
-- ────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['orders','products','users','payment_buttons']
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
             CREATE TRIGGER trg_%I_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
            tbl, tbl, tbl, tbl
        );
    END LOOP;
END;
$$;
