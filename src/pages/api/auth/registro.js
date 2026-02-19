import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';
import { applyRateLimit } from '../../../services/api/rate-limiter.mjs';
import { createUser, getUserByEmail } from '../../../services/database/sqlite.mjs';
import { sendEmail } from '../../../services/api/email-service.mjs';

export const POST = async ({ request, clientAddress }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    const rateLimitResult = applyRateLimit('registro')({
        headers: Object.fromEntries(request.headers),
        context: { clientIP: clientAddress }
    });
    if (rateLimitResult && rateLimitResult.statusCode === 429) {
        return new Response(rateLimitResult.body, { status: 429, headers });
    }

    try {
        const body = await request.json();
        const { name, email, cpf, phone, business_type } = body;

        if (!name || typeof name !== 'string' || name.trim().length < 3) {
            return new Response(JSON.stringify({ error: 'Nome inválido (mínimo 3 caracteres).' }), { status: 400, headers });
        }
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return new Response(JSON.stringify({ error: 'E-mail inválido.' }), { status: 400, headers });
        }
        if (!business_type || typeof business_type !== 'string') {
            return new Response(JSON.stringify({ error: 'Tipo de uso obrigatório.' }), { status: 400, headers });
        }

        const cleanEmail = email.toLowerCase().trim();
        const cleanName = name.trim().substring(0, 100);

        // Check if email already registered
        const existing = getUserByEmail(cleanEmail);
        if (existing) {
            if (existing.status === 'APPROVED') {
                return new Response(JSON.stringify({ error: 'Este e-mail já possui uma conta ativa. Faça login.' }), { status: 409, headers });
            }
            if (existing.status === 'PENDING_APPROVAL') {
                return new Response(JSON.stringify({ error: 'Seu cadastro já foi enviado e está aguardando aprovação.' }), { status: 409, headers });
            }
            if (existing.status === 'REJECTED') {
                return new Response(JSON.stringify({ error: 'Este e-mail foi rejeitado. Entre em contato com o suporte.' }), { status: 409, headers });
            }
        }

        const userId = createUser({
            name: cleanName,
            email: cleanEmail,
            cpf: cpf ? cpf.replace(/\D/g, '').substring(0, 11) : null,
            phone: phone ? phone.replace(/\D/g, '').substring(0, 15) : null,
            business_type: business_type.substring(0, 50)
        });

        secureLog('info', 'Novo cadastro recebido', { userId, email: cleanEmail, business_type });

        // Confirmation email to user (fire-and-forget)
        sendEmail({
            to: cleanEmail,
            subject: 'Cadastro recebido — FlowPay',
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px">
                    <img src="https://flowpay.cash/img/flowpay-logo.png" alt="FlowPay" style="height:48px;margin-bottom:32px" />
                    <h1 style="font-size:1.5rem;margin-bottom:8px">Olá, ${cleanName}!</h1>
                    <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin-bottom:24px">
                        Recebemos seu pedido de cadastro no FlowPay. Nossa equipe irá analisar suas informações e você será notificado por e-mail assim que sua conta for aprovada.
                    </p>
                    <p style="color:rgba(255,255,255,0.4);font-size:0.85rem">Prazo de análise: até 24 horas úteis.</p>
                </div>
            `
        }).catch(() => {});

        return new Response(JSON.stringify({
            success: true,
            message: 'Cadastro enviado. Aguarde aprovação em até 24h.',
            userId
        }), {
            status: 201,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        secureLog('error', 'Erro no cadastro de usuário', { error: error.message });
        return new Response(JSON.stringify({ error: 'Erro interno. Tente novamente.' }), { status: 500, headers });
    }
};

export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, { status: 204, headers });
};
