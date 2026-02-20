import { getDatabase } from '../../services/database/sqlite.mjs';
import { getCorsHeaders } from '../../services/api/config.mjs';

export const GET = async ({ request }) => {
  const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

  try {
    const db = getDatabase();

    // Volume total liquidado
    const settled = db.prepare(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(amount_brl), 0) as total_volume_brl,
        COUNT(CASE WHEN status = 'SETTLED' OR status = 'COMPLETED' THEN 1 END) as settled_count,
        COUNT(CASE WHEN status = 'PIX_PAID' OR status = 'PENDING_REVIEW' OR status = 'APPROVED' THEN 1 END) as pending_count
      FROM orders
    `).get();

    // Ultimas liquidacoes com tx_hash (prova on-chain)
    const recentSettlements = db.prepare(`
      SELECT
        charge_id,
        amount_brl,
        status,
        tx_hash,
        network,
        settled_at,
        created_at
      FROM orders
      WHERE tx_hash IS NOT NULL
      ORDER BY settled_at DESC
      LIMIT 10
    `).all();

    // Batches de PoE (Proof of Existence)
    const poeBatches = db.prepare(`
      SELECT
        id,
        merkle_root,
        batch_size,
        anchor_tx_hash,
        network,
        created_at,
        anchored_at
      FROM poe_batches
      ORDER BY created_at DESC
      LIMIT 5
    `).all();

    // Volume das ultimas 24h
    const last24h = db.prepare(`
      SELECT
        COUNT(*) as orders_24h,
        COALESCE(SUM(amount_brl), 0) as volume_24h
      FROM orders
      WHERE created_at > datetime('now', '-1 day')
      AND status IN ('PIX_PAID', 'PENDING_REVIEW', 'APPROVED', 'SETTLED', 'COMPLETED')
    `).get();

    // Volume dos ultimos 30 dias
    const last30d = db.prepare(`
      SELECT
        COUNT(*) as orders_30d,
        COALESCE(SUM(amount_brl), 0) as volume_30d
      FROM orders
      WHERE created_at > datetime('now', '-30 days')
      AND status IN ('PIX_PAID', 'PENDING_REVIEW', 'APPROVED', 'SETTLED', 'COMPLETED')
    `).get();

    // Status do sistema
    const dbStatus = db.prepare("SELECT 1 as ok").get();

    const payload = {
      ok: true,
      generated_at: new Date().toISOString(),
      system: {
        status: dbStatus?.ok === 1 ? 'operational' : 'degraded',
        version: '1.0.1',
        network: 'base',
      },
      stats: {
        total_orders: settled.total_orders,
        settled_count: settled.settled_count,
        pending_count: settled.pending_count,
        total_volume_brl: parseFloat(settled.total_volume_brl).toFixed(2),
        last_24h: {
          orders: last24h.orders_24h,
          volume_brl: parseFloat(last24h.volume_24h).toFixed(2),
        },
        last_30d: {
          orders: last30d.orders_30d,
          volume_brl: parseFloat(last30d.volume_30d).toFixed(2),
        },
      },
      recent_settlements: recentSettlements.map((o) => ({
        charge_id: o.charge_id,
        amount_brl: parseFloat(o.amount_brl).toFixed(2),
        status: o.status,
        tx_hash: o.tx_hash,
        network: o.network || 'base',
        settled_at: o.settled_at,
        created_at: o.created_at,
      })),
      poe_batches: poeBatches.map((b) => ({
        id: b.id,
        merkle_root: b.merkle_root,
        batch_size: b.batch_size,
        anchor_tx_hash: b.anchor_tx_hash,
        network: b.network || 'base',
        created_at: b.created_at,
        anchored_at: b.anchored_at,
      })),
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Transparency data temporarily unavailable',
        generated_at: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      }
    );
  }
};
