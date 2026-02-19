import { getDatabase } from '../../../services/database/sqlite.mjs';
import { getCorsHeaders } from '../../../services/api/config.mjs';

export const GET = async ({ request, cookies }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    // 🔐 AUTHENTICATION CHECK: Verify admin password
    const authHeader = request.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
        return new Response(JSON.stringify({
            error: 'Unauthorized',
            message: 'Admin authentication required'
        }), {
            status: 401,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }

    try {
        const db = getDatabase();

        // 1. Total Wallet Users
        const users = db.prepare("SELECT COUNT(*) as total FROM wallet_sessions").get();

        // 2. Guest Accesses in last 24h
        const guests = db.prepare(`
            SELECT COUNT(*) as total FROM audit_log 
            WHERE event_type = 'ACCESS' AND actor = 'GUEST'
            AND created_at > datetime('now', '-1 day')
        `).get();

        // 3. Payments in last 24h
        const payments = db.prepare(`
            SELECT COUNT(*) as total, SUM(amount_brl) as volume FROM orders 
            WHERE status IN ('PIX_PAID', 'PENDING_REVIEW', 'APPROVED', 'SETTLED')
            AND created_at > datetime('now', '-1 day')
        `).get();

        return new Response(JSON.stringify({
            success: true,
            metrics: {
                total_wallets: users.total,
                guest_access_24h: guests.total,
                payments_24h: payments.total,
                volume_24h: payments.volume || 0
            }
        }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal error', detail: error.message }), { status: 500, headers });
    }
};
