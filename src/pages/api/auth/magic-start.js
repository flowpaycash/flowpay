import crypto from 'crypto';
import { saveAuthToken } from '../../../services/database/sqlite.mjs';
import { config, secureLog, getCorsHeaders } from '../../../services/api/config.mjs';

export const POST = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    try {
        const { email } = await request.json();

        if (!email || !email.includes('@')) {
            return new Response(JSON.stringify({ error: 'E-mail inválido' }), { status: 400, headers });
        }

        // Generate secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + config.auth.tokenExpiration);

        // Save to DB
        saveAuthToken(email, token, expiresAt);

        const domain = process.env.URL || 'http://localhost:4321';
        const magicLink = `${domain}/auth/verify?token=${token}`;

        // In DEV or if no SMTP configured, log to console
        if (process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST) {
            console.log('\n========================================');
            console.log('✨ MAGIC LINK GENERATED (DEV MODE) ✨');
            console.log(`Email: ${email}`);
            console.log(`Link: ${magicLink}`);
            console.log('========================================\n');

            secureLog('info', 'Magic link generated in dev mode', { email });

            return new Response(JSON.stringify({
                success: true,
                sent: false,
                message: 'Link gerado (dev). Veja o console do servidor.'
            }), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
        }

        // TODO: Implement real SMTP send logic here if process.env.SMTP_HOST is present
        secureLog('info', 'SMTP not fully implemented yet, logging to console instead', { email });
        console.log(`[PROD MOCK] Link for ${email}: ${magicLink}`);

        return new Response(JSON.stringify({
            success: true,
            sent: false,
            message: 'E-mail service em configuração. Link logado no servidor.'
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
