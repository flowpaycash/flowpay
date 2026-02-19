import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';
import { listUsers, approveUser, rejectUser, getUserById } from '../../../services/database/sqlite.mjs';
import { sendEmail } from '../../../services/api/email-service.mjs';

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

            sendEmail({
                to: user.email,
                subject: 'Sua conta FlowPay foi aprovada!',
                html: `
                    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px">
                        <img src="https://flowpay.cash/img/flowpay-logo.png" alt="FlowPay" style="height:48px;margin-bottom:32px" />
                        <h1 style="font-size:1.5rem;margin-bottom:8px">Conta aprovada, ${user.name}!</h1>
                        <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin-bottom:32px">
                            Sua conta FlowPay foi aprovada. Acesse o dashboard para começar a criar seus links de pagamento.
                        </p>
                        <a href="https://flowpay.cash/dashboard" style="display:inline-block;background:linear-gradient(135deg,#ff007a,#ff7a00);color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:1rem">
                            Acessar Dashboard
                        </a>
                    </div>
                `
            }).catch(() => {});

            return new Response(JSON.stringify({ success: true, message: 'Usuário aprovado.' }), {
                status: 200,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'reject') {
            const rejectReason = reason || 'Reprovado pelo administrador';
            rejectUser(userId, rejectReason, 'admin');
            secureLog('info', 'Usuário rejeitado', { userId, email: user.email, reason: rejectReason });

            sendEmail({
                to: user.email,
                subject: 'Atualização sobre seu cadastro FlowPay',
                html: `
                    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px">
                        <img src="https://flowpay.cash/img/flowpay-logo.png" alt="FlowPay" style="height:48px;margin-bottom:32px" />
                        <h1 style="font-size:1.5rem;margin-bottom:8px">Olá, ${user.name}</h1>
                        <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin-bottom:16px">
                            Infelizmente não foi possível aprovar seu cadastro no FlowPay no momento.
                        </p>
                        ${rejectReason !== 'Reprovado pelo administrador' ? `<p style="color:rgba(255,255,255,0.5);font-size:0.9rem;margin-bottom:24px">Motivo: ${rejectReason}</p>` : ''}
                        <p style="color:rgba(255,255,255,0.4);font-size:0.85rem">Em caso de dúvidas, entre em contato com nosso suporte.</p>
                    </div>
                `
            }).catch(() => {});

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
