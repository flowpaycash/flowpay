import crypto from 'crypto';
import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';
import { registroLimiterIP, registroLimiterEmail } from '../../../services/api/rate-limiter.mjs';
import { createUser, getUserByEmail, approveUser, saveAuthToken } from '../../../services/database/sqlite.mjs';
import { sendEmail } from '../../../services/api/email-service.mjs';
import { registroTemplate } from '../../../services/api/email/templates/registro.mjs';
import { adminNovoCadastroTemplate } from '../../../services/api/email/templates/admin-notificacao.mjs';
import { aprovacaoTemplate } from '../../../services/api/email/templates/aprovacao.mjs';
import { redis } from '../../../services/api/redis-client.mjs';

export const POST = async ({ request, clientAddress }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    // Extrair IP real (Railway usa proxy)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('cf-connecting-ip')
        || clientAddress
        || 'unknown';

    // Checar rate limit por IP ANTES de ler o JSON
    if (registroLimiterIP) {
        try {
            await registroLimiterIP.consume(ip);
        } catch (rejRes) {
            if (rejRes && rejRes.msBeforeNextReset !== undefined) {
                const secs = Math.round(rejRes.msBeforeNextReset / 1000) || 1;
                return new Response(JSON.stringify({
                    error: 'Muitas tentativas. Tente novamente em ' + Math.ceil(secs / 60) + ' minutos.'
                }), {
                    status: 429,
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json',
                        'Retry-After': String(secs)
                    }
                });
            }
            // Se for erro de conexão do Redis, cai aqui e continua (Fail Open)
            secureLog('warn', '[RATE-LIMIT] Falha no limiter de IP (Fail Open)', { error: rejRes?.message || rejRes });
        }
    } else {
        secureLog('warn', '[RATE-LIMIT] Redis indisponível, limitação de IP desativada.');
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

        // Checar rate limit por email APÓS extrair e sanitizar o email
        if (registroLimiterEmail) {
            try {
                await registroLimiterEmail.consume(cleanEmail);
            } catch (rejRes) {
                if (rejRes && rejRes.msBeforeNextReset !== undefined) {
                    const secs = Math.round(rejRes.msBeforeNextReset / 1000) || 1;
                    return new Response(JSON.stringify({
                        error: 'Este email atingiu o limite de tentativas de cadastro. Tente novamente em ' + Math.ceil(secs / 60) + ' minutos.'
                    }), {
                        status: 429,
                        headers: {
                            ...headers,
                            'Content-Type': 'application/json',
                            'Retry-After': String(secs)
                        }
                    });
                }
                // Se for erro de conexão do Redis, cai aqui e continua (Fail Open)
                secureLog('warn', '[RATE-LIMIT] Falha no limiter de Email (Fail Open)', { error: rejRes?.message || rejRes });
            }
        } else {
            secureLog('warn', '[RATE-LIMIT] Redis indisponível, limitação de Email desativada.');
        }

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

        // Confirmação para o usuário
        const shouldAutoApprove = process.env.AUTO_APPROVE === 'true';

        if (shouldAutoApprove) {
            console.log('[AUTO-APPROVE]', cleanEmail, userId);
            try {
                approveUser(userId, "system_auto");

                const token = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

                if (redis) {
                    // Armazena por e-mail (para controle de reenvio) e por token (para verificacao rapida)
                    await Promise.all([
                        redis.set(`magic:${cleanEmail}`, token, 'EX', 900),
                        redis.set(`auth_token:${token}`, cleanEmail, 'EX', 900)
                    ]).catch(err => {
                        secureLog('warn', 'Redis set falhou no auto-approve, fallback to sqlite only', { error: err.message });
                    });
                }

                // Fallback / sync para Magic Link nativo compatível com verify
                saveAuthToken(cleanEmail, token, expiresAt);

                const domain = process.env.URL || "https://flowpay.cash";
                const magicLink = `${domain}/auth/verify?token=${token}`;

                void sendEmail({
                    to: cleanEmail,
                    subject: 'Sua conta FlowPay foi aprovada! Acesse com seu link mágico',
                    html: aprovacaoTemplate({
                        name: cleanName,
                        loginUrl: magicLink,
                        expiresHours: 0.25
                    })
                }).then((result) => {
                    if (!result.success) {
                        secureLog('warn', 'Falha no envio de e-mail de aprovação', {
                            userId, email: cleanEmail, error: result.error
                        });
                    }
                }).catch((err) => {
                    secureLog('error', 'Erro inesperado no envio de e-mail de auto-aprovação', {
                        userId, email: cleanEmail, error: err.message
                    });
                });
            } catch (autoApproveErr) {
                secureLog('error', 'Erro na auto-aprovação', { error: autoApproveErr.message });
                // Fallback para fluxo pendente, continua
            }
        } else {
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
        }

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
            message: shouldAutoApprove ? 'Cadastro aprovado!' : 'Cadastro recebido. Aguardando aprovação.',
            userId
        }), {
            status: shouldAutoApprove ? 200 : 201,
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
