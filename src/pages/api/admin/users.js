import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';
import { listUsers, approveUser, rejectUser, getUserById } from '../../../services/database/sqlite.mjs';

function checkAdminAuth(request) {
    const authHeader = request.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;
    return authHeader && authHeader === `Bearer ${adminPassword}`;
}

// GET /api/admin/users - list all users
export const GET = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    if (!checkAdminAuth(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    try {
        const url = new URL(request.url);
        const status = url.searchParams.get('status') || null;
        const users = listUsers(status);

        return new Response(JSON.stringify({ success: true, users }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        secureLog('error', 'Admin users list error', { error: error.message });
        return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
    }
};

// POST /api/admin/users - approve or reject user
export const POST = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    if (!checkAdminAuth(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    try {
        const body = await request.json();
        const { action, userId, reason } = body;

        if (!userId || !action) {
            return new Response(JSON.stringify({ error: 'userId e action são obrigatórios.' }), { status: 400, headers });
        }

        const user = getUserById(userId);
        if (!user) {
            return new Response(JSON.stringify({ error: 'Usuário não encontrado.' }), { status: 404, headers });
        }

        if (action === 'approve') {
            approveUser(userId, 'admin');
            secureLog('info', 'Usuário aprovado', { userId, email: user.email });

            // TODO: Send approval email via Resend
            // try {
            //   const { sendEmail } = await import('../../services/api/email-service.mjs');
            //   await sendEmail({ to: user.email, subject: 'Conta FlowPay Aprovada!', html: '...' });
            // } catch {}

            return new Response(JSON.stringify({ success: true, message: 'Usuário aprovado.' }), {
                status: 200,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'reject') {
            rejectUser(userId, reason || 'Reprovado pelo administrador', 'admin');
            secureLog('info', 'Usuário rejeitado', { userId, email: user.email, reason });
            return new Response(JSON.stringify({ success: true, message: 'Usuário rejeitado.' }), {
                status: 200,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Ação inválida. Use approve ou reject.' }), { status: 400, headers });

    } catch (error) {
        secureLog('error', 'Admin user action error', { error: error.message });
        return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
    }
};

export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, { status: 204, headers });
};
