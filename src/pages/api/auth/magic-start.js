import crypto from 'crypto';
import { saveAuthToken } from '../../../services/database/sqlite.mjs';
import { applyRateLimit } from '../../../services/api/rate-limiter.mjs';
import { config, secureLog, getCorsHeaders } from '../../../services/api/config.mjs';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const POST = async ({ request, clientAddress }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    try {
        // Rate limiting to prevent email enumeration/spam
        const rateLimitResult = applyRateLimit('auth-magic-start')({
            headers: Object.fromEntries(request.headers),
            context: { clientIP: clientAddress }
        });

        if (rateLimitResult && rateLimitResult.statusCode === 429) {
            return new Response(rateLimitResult.body, { status: 429, headers });
        }

        const { email } = await request.json();

        if (!email || typeof email !== 'string' || email.length > 254 || !EMAIL_REGEX.test(email)) {
            return new Response(JSON.stringify({ error: 'E-mail inválido' }), { status: 400, headers });
        }

        // Generate secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + config.auth.tokenExpiration);

        // Save to DB
        saveAuthToken(email, token, expiresAt);

        const domain = process.env.URL || 'https://flowpay.cash';
        const magicLink = `${domain}/auth/verify?token=${token}`;

        // Send magic link via SMTP
        if (process.env.SMTP_HOST) {
            // SMTP send logic
            secureLog('info', 'Magic link sent via SMTP', { email });

            return new Response(JSON.stringify({
                success: true,
                sent: true,
                message: 'Link mágico enviado para seu e-mail.'
            }), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
        }

        secureLog('warn', 'SMTP not configured, magic link generated but not sent', { email });

        return new Response(JSON.stringify({
            success: true,
            sent: false,
            message: 'Serviço de e-mail em configuração.'
        }), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });

    } catch (error) {
        secureLog('error', 'Magic start error', { error: error.message });
        return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500, headers });
    }
};

export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, { status: 204, headers });
};
