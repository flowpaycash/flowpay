import { getCorsHeaders, secureLog } from '../../services/api/config.mjs';

const INFURA_API_KEY = () => process.env.INFURA_API_KEY || '';
const INFURA_BUNDLER_URL = 'https://gas.api.infura.io/networks/137/bundler';

const ALLOWED_METHODS = new Set([
    'eth_sendUserOperation',
    'eth_estimateUserOperationGas',
    'eth_getUserOperationByHash',
    'eth_getUserOperationReceipt',
    'eth_supportedEntryPoints',
]);

export const POST = async ({ request }) => {
    const headers = {
        ...getCorsHeaders({ headers: Object.fromEntries(request.headers) }),
        'Content-Type': 'application/json',
    };

    const apiKey = INFURA_API_KEY();
    if (!apiKey) {
        return new Response(JSON.stringify({ error: { message: 'Bundler not configured' } }), {
            status: 503,
            headers,
        });
    }

    try {
        const body = await request.json();
        const { method, params } = body;

        if (!method || typeof method !== 'string' || !ALLOWED_METHODS.has(method)) {
            return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
                status: 403,
                headers,
            });
        }

        const res = await fetch(`${INFURA_BUNDLER_URL}/${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: params || [] }),
        });

        const data = await res.json();
        return new Response(JSON.stringify(data), { status: 200, headers });
    } catch (err) {
        secureLog('error', 'Infura bundler proxy error', { error: err.message });
        return new Response(JSON.stringify({ error: { message: 'Proxy error' } }), {
            status: 502,
            headers,
        });
    }
};

export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, { status: 204, headers });
};
