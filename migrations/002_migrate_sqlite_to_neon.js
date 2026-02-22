#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════
 * FLOWPAY · SQLite → Neon PostgreSQL Migration Script
 * ════════════════════════════════════════════════════════════════
 * Usage:
 *   DATABASE_URL=postgresql://... node migrations/002_migrate_sqlite_to_neon.js
 *
 * SAFETY:
 *   - Dry-run by default. Set MIGRATE=true to execute.
 *   - Skips already-migrated rows (upsert on unique keys).
 *   - Full summary report at the end.
 * ════════════════════════════════════════════════════════════════
 */

import Database from 'better-sqlite3';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────────────────────

const DRY_RUN = process.env.MIGRATE !== 'true';
const DATABASE_URL = process.env.DATABASE_URL;
const SQLITE_PATH = process.env.SQLITE_PATH ||
    path.join(__dirname, '..', 'data', 'flowpay', 'flowpay.db');

if (!DATABASE_URL) {
    console.error('❌  DATABASE_URL não configurado. Abortando.');
    process.exit(1);
}

if (DRY_RUN) {
    console.log('⚠️  DRY-RUN ativo. Nenhum dado será gravado. Set MIGRATE=true para executar.');
}

// ── Conexões ─────────────────────────────────────────────────────────────────

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const pgPool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ── Relatório ─────────────────────────────────────────────────────────────────

const report = {
    tables: {},
    errors: [],
    startTime: Date.now(),
};

function logTable(table, inserted, skipped, errored) {
    report.tables[table] = { inserted, skipped, errored };
    console.log(
        `  ${table.padEnd(20)} ✅ ${String(inserted).padStart(5)} inseridas  ` +
        `⏭  ${String(skipped).padStart(5)} já existiam  ` +
        `❌ ${String(errored).padStart(5)} erros`
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function upsertRows({ pgClient, table, rows, conflictColumn, mapFn }) {
    let inserted = 0, skipped = 0, errored = 0;

    for (const row of rows) {
        try {
            const mapped = mapFn(row);
            const cols = Object.keys(mapped);
            const vals = Object.values(mapped);
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
            const colList = cols.map(c => `"${c}"`).join(', ');

            const sql = `
                INSERT INTO ${table} (${colList})
                VALUES (${placeholders})
                ON CONFLICT (${conflictColumn}) DO NOTHING
            `;

            if (!DRY_RUN) {
                const result = await pgClient.query(sql, vals);
                if (result.rowCount > 0) inserted++;
                else skipped++;
            } else {
                inserted++; // simula para dry-run
            }
        } catch (err) {
            errored++;
            report.errors.push({ table, row: row.id || '?', error: err.message });
        }
    }

    return { inserted, skipped, errored };
}

// ── Funções de migração por tabela ────────────────────────────────────────────

async function migrateOrders(pgClient) {
    const rows = sqlite.prepare('SELECT * FROM orders ORDER BY id ASC').all();
    const result = await upsertRows({
        pgClient,
        table: 'orders',
        rows,
        conflictColumn: 'charge_id',
        mapFn: (r) => ({
            charge_id: r.charge_id,
            amount_brl: r.amount_brl,
            amount_usdt: r.amount_usdt,
            exchange_rate: r.exchange_rate,
            product_ref: r.product_ref,
            product_name: r.product_name,
            product_price: r.product_price,
            customer_ref: r.customer_ref,
            customer_wallet: r.customer_wallet,
            customer_cpf: r.customer_cpf,
            customer_email: r.customer_email,
            customer_name: r.customer_name,
            customer_metadata: r.customer_metadata,
            status: r.status || 'CREATED',
            pix_qr: r.pix_qr,
            pix_copy_paste: r.pix_copy_paste,
            checkout_url: r.checkout_url,
            metadata: r.metadata,
            bridge_status: r.bridge_status || 'PENDING',
            bridge_attempts: r.bridge_attempts || 0,
            bridge_last_error: r.bridge_last_error,
            poe_batch_id: r.poe_batch_id,
            tx_hash: r.tx_hash,
            network: r.network,
            receipt_cid: r.receipt_cid,
            receipt_ipfs_url: r.receipt_ipfs_url,
            paid_at: r.paid_at,
            reviewed_at: r.reviewed_at,
            reviewed_by: r.reviewed_by,
            settled_at: r.settled_at,
            created_at: r.created_at || new Date().toISOString(),
            updated_at: r.updated_at || new Date().toISOString(),
        }),
    });
    logTable('orders', result.inserted, result.skipped, result.errored);
}

async function migrateUsers(pgClient) {
    const rows = sqlite.prepare('SELECT * FROM users ORDER BY id ASC').all();
    const result = await upsertRows({
        pgClient,
        table: 'users',
        rows,
        conflictColumn: 'email',
        mapFn: (r) => ({
            name: r.name,
            email: r.email.toLowerCase().trim(),
            cpf: r.cpf,
            document_type: r.document_type || 'CPF',
            phone: r.phone,
            business_type: r.business_type,
            status: r.status || 'PENDING_APPROVAL',
            approved_at: r.approved_at,
            approved_by: r.approved_by,
            rejected_reason: r.rejected_reason,
            created_at: r.created_at || new Date().toISOString(),
            updated_at: r.updated_at || new Date().toISOString(),
        }),
    });
    logTable('users', result.inserted, result.skipped, result.errored);
}

async function migratePaymentButtons(pgClient) {
    // Precisamos mapear user_id do SQLite para user_id do Neon (via email)
    const rows = sqlite.prepare('SELECT pb.*, u.email FROM payment_buttons pb JOIN users u ON pb.user_id = u.id ORDER BY pb.id ASC').all();

    let inserted = 0, skipped = 0, errored = 0;

    for (const row of rows) {
        try {
            // Busca user_id no Neon pelo email
            let pgUserId = null;
            if (!DRY_RUN) {
                const res = await pgClient.query('SELECT id FROM users WHERE email = $1', [row.email.toLowerCase()]);
                pgUserId = res.rows[0]?.id;
                if (!pgUserId) { skipped++; continue; }
            } else {
                pgUserId = 0; // placeholder em dry-run
            }

            const sql = `
                INSERT INTO payment_buttons (button_id, user_id, title, description, amount_brl, amount_fixed, payment_methods, crypto_address, crypto_network, active, created_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                ON CONFLICT (button_id) DO NOTHING
            `;
            const vals = [
                row.button_id, pgUserId, row.title, row.description,
                row.amount_brl, Boolean(row.amount_fixed),
                row.payment_methods || '["pix","crypto"]',
                row.crypto_address, row.crypto_network || 'polygon',
                Boolean(row.active ?? 1), row.created_at || new Date().toISOString(),
            ];

            if (!DRY_RUN) {
                const res = await pgClient.query(sql, vals);
                if (res.rowCount > 0) inserted++; else skipped++;
            } else {
                inserted++;
            }
        } catch (err) {
            errored++;
            report.errors.push({ table: 'payment_buttons', row: row.button_id, error: err.message });
        }
    }

    logTable('payment_buttons', inserted, skipped, errored);
}

async function migrateAuditLog(pgClient) {
    const rows = sqlite.prepare('SELECT * FROM audit_log ORDER BY id ASC').all();
    let inserted = 0, skipped = 0, errored = 0;

    for (const row of rows) {
        try {
            const sql = `INSERT INTO audit_log (event_type, actor, action, details, order_id, created_at) VALUES ($1,$2,$3,$4,$5,$6)`;
            const vals = [row.event_type, row.actor, row.action, row.details, row.order_id, row.created_at || new Date().toISOString()];
            if (!DRY_RUN) {
                await pgClient.query(sql, vals);
                inserted++;
            } else {
                inserted++;
            }
        } catch (err) {
            errored++;
        }
    }

    logTable('audit_log', inserted, skipped, errored);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function runMigration() {
    console.log('\n════════════════════════════════════════');
    console.log('  FLOWPAY · SQLite → Neon Migration');
    console.log(`  Mode: ${DRY_RUN ? 'DRY-RUN (seguro)' : '🔴 PRODUÇÃO'}`);
    console.log('════════════════════════════════════════\n');

    const pgClient = await pgPool.connect();

    try {
        // 1. Aplicar schema
        if (!DRY_RUN) {
            const schemaSQL = fs.readFileSync(path.join(__dirname, '001_initial_schema.sql'), 'utf-8');
            await pgClient.query(schemaSQL);
            console.log('✅  Schema aplicado\n');
        } else {
            console.log('⏭  Schema (skip em dry-run)\n');
        }

        console.log('📦  Migrando tabelas:\n');

        await migrateUsers(pgClient);
        await migrateOrders(pgClient);
        await migratePaymentButtons(pgClient);
        await migrateAuditLog(pgClient);

    } finally {
        pgClient.release();
        await pgPool.end();
        sqlite.close();
    }

    // ── Relatório final
    const elapsed = ((Date.now() - report.startTime) / 1000).toFixed(1);
    const totalInserted = Object.values(report.tables).reduce((s, t) => s + t.inserted, 0);
    const totalErrors = report.errors.length;

    console.log('\n════════════════════════════════════════');
    console.log(`  Total inseridos : ${totalInserted}`);
    console.log(`  Total erros     : ${totalErrors}`);
    console.log(`  Tempo           : ${elapsed}s`);

    if (totalErrors > 0) {
        console.log('\n❌  Erros encontrados:');
        report.errors.slice(0, 10).forEach(e =>
            console.log(`  [${e.table}] row=${e.row}: ${e.error}`)
        );
    }

    console.log('════════════════════════════════════════\n');

    if (DRY_RUN) {
        console.log('✅  Dry-run concluído. Execute com MIGRATE=true para efetivar.\n');
    } else {
        console.log('✅  Migração concluída!\n');
    }
}

runMigration().catch((err) => {
    console.error('💥  Erro fatal:', err.message);
    process.exit(1);
});
