import { secureLog } from '../../../services/api/config.mjs';
import crypto from 'crypto';

/**
 * Endpoint para receber webhooks do QuickNode
 * Suporta monitoramento de transferências USDT e Wallets
 */
export const POST = async ({ request }) => {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get('x-qn-signature') || request.headers.get('x-quicknode-signature');
        const secret = process.env.QUICKNODE_WEBHOOK_SECRET;

        // Validação básica se o secret estiver configurado
        if (secret && signature) {
            const hmac = crypto.createHmac('sha256', secret);
            const digest = hmac.update(rawBody).digest('hex');

            if (signature !== digest) {
                secureLog('error', 'QuickNode Webhook: Assinatura inválida');
                return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
            }
        }

        const data = JSON.parse(rawBody);

        secureLog('info', 'QuickNode Webhook recebido', {
            type: Array.isArray(data) ? 'batch' : 'single',
            count: Array.isArray(data) ? data.length : 1
        });

        // TODO: Implementar lógica de processamento conforme o evento
        // Ex: Confirmar depósito de USDT, atualizar status de ponte, etc.

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        secureLog('error', 'QuickNode Webhook: Erro crítico', { error: error.message });
        return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
    }
};

/**
 * Suporte a preflight CORS
 */
export const OPTIONS = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-qn-signature, x-quicknode-signature'
        }
    });
};
