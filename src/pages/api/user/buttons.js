import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';
import { getUserByEmail, createPaymentButton, listPaymentButtonsByUser } from '../../../services/database/sqlite.mjs';
import crypto from 'crypto';
import { verifySessionToken } from '../../../services/auth/session.mjs';

function validateUserSession(request) {
    // 1. Check for signed cookie first (preferred)
    const cookies = request.headers.get('cookie') || '';
    const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('flowpay_session='));

    let token = null;
    if (sessionCookie) {
        token = sessionCookie.split('=')[1];
    } else {
        // 2. Fallback to header if cookie is missing (for API compatibility)
        token = request.headers.get('x-user-token');
    }

    if (!token) return null;

    const payload = verifySessionToken(token);
    if (!payload) {
        secureLog('warn', 'Tentativa de acesso com token invalido', { token: token.substring(0, 10) + '...' });
        return null;
    }

    return { email: payload.email.toLowerCase().trim(), token };
}

// GET /api/user/buttons - list user's payment buttons
export const GET = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    const session = validateUserSession(request);
    if (!session) {
        return new Response(JSON.stringify({ error: 'Autenticação necessária.' }), { status: 401, headers });
    }

    try {
        const user = getUserByEmail(session.email);
        if (!user || user.status !== 'APPROVED') {
            return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), { status: 403, headers });
        }

        const buttons = listPaymentButtonsByUser(user.id);
        return new Response(JSON.stringify({ success: true, buttons }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        secureLog('error', 'List buttons error', { error: error.message });
        return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers });
    }
};

// POST /api/user/buttons - create a payment button
export const POST = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    const session = validateUserSession(request);
    if (!session) {
        return new Response(JSON.stringify({ error: 'Autenticação necessária.' }), { status: 401, headers });
    }

    try {
        const user = getUserByEmail(session.email);
        if (!user || user.status !== 'APPROVED') {
            return new Response(JSON.stringify({ error: 'Conta não aprovada. Aguarde a aprovação.' }), { status: 403, headers });
        }

        const body = await request.json();
        const { title, description, amount_brl, amount_fixed, payment_methods, crypto_address, crypto_network } = body;

        if (!title || typeof title !== 'string' || title.trim().length < 2) {
            return new Response(JSON.stringify({ error: 'Título inválido (mínimo 2 caracteres).' }), { status: 400, headers });
        }

        if (amount_fixed && (!amount_brl || isNaN(parseFloat(amount_brl)) || parseFloat(amount_brl) <= 0)) {
            return new Response(JSON.stringify({ error: 'Valor inválido.' }), { status: 400, headers });
        }

        const methods = Array.isArray(payment_methods) ? payment_methods : ['pix', 'crypto'];
        const validMethods = methods.filter(m => ['pix', 'crypto'].includes(m));
        if (validMethods.length === 0) {
            return new Response(JSON.stringify({ error: 'Selecione pelo menos um método de pagamento.' }), { status: 400, headers });
        }

        if (validMethods.includes('crypto') && !crypto_address) {
            return new Response(JSON.stringify({ error: 'Endereço de carteira cripto obrigatório para receber cripto.' }), { status: 400, headers });
        }

        const buttonId = crypto.randomBytes(8).toString('hex');

        createPaymentButton({
            button_id: buttonId,
            user_id: user.id,
            title: title.trim().substring(0, 100),
            description: description ? description.trim().substring(0, 500) : null,
            amount_brl: amount_fixed && amount_brl ? parseFloat(amount_brl) : null,
            amount_fixed: !!amount_fixed,
            payment_methods: validMethods,
            crypto_address: crypto_address ? crypto_address.trim() : null,
            crypto_network: crypto_network || 'polygon'
        });

        const embedUrl = `${process.env.URL || 'https://flowpay.cash'}/pay/${buttonId}`;
        const embedCode = `<iframe src="${embedUrl}" width="400" height="520" frameborder="0" style="border-radius:16px;"></iframe>`;

        secureLog('info', 'Botão de pagamento criado', { buttonId, userId: user.id });

        return new Response(JSON.stringify({
            success: true,
            button_id: buttonId,
            embed_url: embedUrl,
            embed_code: embedCode
        }), {
            status: 201,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        secureLog('error', 'Create button error', { error: error.message });
        return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers });
    }
};

export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, { status: 204, headers });
};
