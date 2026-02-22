/**
 * GET /api/admin/logs — Audit log com paginação server-side
 * Protegido por sessão admin.
 */
import * as Sentry from '@sentry/astro';
import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';
import { requireAdminSession, withAdminNoStoreHeaders } from '../../../services/api/admin-auth.mjs';
import { getDatabase } from '../../../services/database/sqlite.mjs';

export const GET = async ({ request, cookies, url }) => {
    const headers = withAdminNoStoreHeaders({
        ...getCorsHeaders({ headers: Object.fromEntries(request.headers) }),
        'Content-Type': 'application/json',
    });

    if (!requireAdminSession(cookies)) {
        Sentry.addBreadcrumb({ category: 'admin.logs', message: 'Acesso nao autorizado', level: 'warning' });
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    try {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '500', 10), 1000);
        const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
        const type = url.searchParams.get('type') || null; // ex: PAYMENT, SECURITY

        const db = getDatabase();

        let query = 'SELECT * FROM audit_log';
        let countQ = 'SELECT COUNT(*) as total FROM audit_log';
        const params = [];

        if (type) {
            query += ' WHERE event_type LIKE ?';
            countQ += ' WHERE event_type LIKE ?';
            params.push(`${type}%`);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

        const logs = db.prepare(query).all(...params, limit, offset);
        const total = db.prepare(countQ).get(...params)?.total ?? 0;

        Sentry.addBreadcrumb({
            category: 'admin.logs',
            message: 'Logs listados',
            level: 'info',
            data: { count: logs.length, total },
        });

        return new Response(JSON.stringify({ success: true, logs, total, limit, offset }), {
            status: 200,
            headers,
        });

    } catch (error) {
        secureLog('error', 'Admin logs error', { error: error.message });
        Sentry.withScope((scope) => {
            scope.setLevel('error');
            scope.setTag('source', 'admin_logs');
            Sentry.captureException(error);
        });
        return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
    }
};

export const OPTIONS = async ({ request }) => {
    const headers = withAdminNoStoreHeaders(getCorsHeaders({ headers: Object.fromEntries(request.headers) }));
    return new Response(null, { status: 204, headers });
};
