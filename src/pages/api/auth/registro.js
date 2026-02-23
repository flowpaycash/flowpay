import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';
import { applyRateLimit } from '../../../services/api/rate-limiter.mjs';
import { createUser, getUserByEmail } from '../../../services/database/sqlite.mjs';
import { sendEmail } from '../../../services/api/email-service.mjs';
import { registroTemplate } from '../../../services/api/email/templates/registro.mjs';
import { adminNovoCadastroTemplate } from '../../../services/api/email/templates/admin-notificacao.mjs';

export const POST = async ({ request, clientAddress }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    const rateLimitResult = await applyRateLimit('registro')({
        headers: Object.fromEntries(request.headers),
        context: { clientIP: clientAddress }
    });
    if (rateLimitResult && rateLimitResult.statusCode === 429) {
        return new Response(rateLimitResult.body, { status: 429, headers });
    }

    try {
        const body = await request.json();
        const { name, email, document: docValue, document_type, phone, business_type } = body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return new Response(JSON.stringify({ error: 'Nome inválido.' }), { status: 400, headers });
        }
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return new Response(JSON.stringify({ error: 'E-mail inválido.' }), { status: 400, headers });
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
        }

        const userId = createUser({
            name: cleanName,
            email: cleanEmail,
            document: docValue ? docValue.replace(/\D/g, '') : null,
            document_type: document_type || 'CPF',
            phone: phone ? phone.replace(/\D/g, '').substring(0, 15) : null,
            business_type: business_type ? business_type.substring(0, 50) : 'not_specified'
        });

        secureLog('info', 'Novo cadastro recebido', { userId, email: cleanEmail, document_type });

        // Confirmação para o usuário (fire-and-forget)
        void sendEmail({
            to: cleanEmail,
            subject: 'Cadastro recebido — FlowPay',
            html: registroTemplate({ name: cleanName }),
        }).then((result) => {
            if (!result.success) {
                secureLog('warn', 'Falha no envio de e-mail de confirmação de cadastro', {
                    userId,
                    email: cleanEmail,
                    error: result.error || 'unknown_email_error',
                    attempts: result.attempts || []
                });
            }
        }).catch((err) => {
            secureLog('error', 'Erro inesperado no envio de e-mail de cadastro', {
                userId,
                email: cleanEmail,
                error: err.message
            });
        });

        // Notificação para o admin (fire-and-forget)
        const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
        if (adminEmail) {
            const registeredAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            void sendEmail({
                to: adminEmail,
                subject: `[FlowPay] Novo cadastro: ${cleanName}`,
                html: adminNovoCadastroTemplate({
                    name: cleanName,
                    email: cleanEmail,
                    businessType: business_type,
                    phone: phone || null,
                    registeredAt,
                    document: docValue || '—',
                    documentType: document_type || 'CPF',
                }),
            }).then((result) => {
                if (!result.success) {
                    secureLog('warn', 'Falha no envio de e-mail de notificação para admin (cadastro)', {
                        userId,
                        email: cleanEmail,
                        error: result.error || 'unknown_email_error'
                    });
                }
            }).catch((err) => {
                secureLog('error', 'Erro inesperado no envio de e-mail para admin (cadastro)', {
                    userId,
                    email: cleanEmail,
                    error: err.message
                });
            });
        }

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
