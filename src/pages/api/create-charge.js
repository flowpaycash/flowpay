import { applyRateLimit } from '../../services/api/rate-limiter.mjs';
import { getCorsHeaders, secureLog, logPixTransaction, logAPIError } from '../../services/api/config.mjs';
import {
    handleExternalAPIError,
    FlowPayError,
    ERROR_TYPES
} from '../../services/api/error-handler.mjs';
import { validateData, sanitizeData } from '../../services/api/validation-middleware.mjs';
import { createOrder } from '../../services/database/sqlite.mjs';

export const POST = async ({ request, clientAddress }) => {
    // 1. Setup & CORS
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    try {
        // 🚦 Rate Limiting (Aproximado para Astro)
        // No Astro, podemos usar o clientAddress
        const rateLimitResult = applyRateLimit('create-pix-charge')({
            headers: Object.fromEntries(request.headers),
            context: { clientIP: clientAddress }
        });

        if (rateLimitResult && rateLimitResult.statusCode === 429) {
            return new Response(rateLimitResult.body, {
                status: 429,
                headers: { ...headers, ...rateLimitResult.headers }
            });
        }

        // 2. Parse & Validate
        const rawBody = await request.json();
        validateData(rawBody, 'createPixCharge');

        const sanitizedData = sanitizeData(rawBody);
        const {
            wallet,
            valor,
            moeda,
            id_transacao,
            product_id
        } = sanitizedData;

        const validatedValue = parseFloat(valor);

        // 3. Woovi API Implementation
        const WOOVI_API_KEY = process.env.WOOVI_API_KEY;
        const WOOVI_API_URL = process.env.WOOVI_API_URL || 'https://api.woovi.com';

        if (!WOOVI_API_KEY) {
            throw new Error('Configuração da API Woovi não encontrada');
        }

        const cleanApiKey = WOOVI_API_KEY;

        const pixData = {
            correlationID: id_transacao,
            value: Math.round(validatedValue * 100),
            expiresIn: 3600,
            additionalInfo: [
                { key: 'wallet', value: wallet },
                { key: 'moeda', value: moeda },
                { key: 'product_id', value: product_id || 'manual' }
            ]
        };

        logPixTransaction('info', 'Astro API: Criando cobrança PIX', {
            id: id_transacao,
            amount: validatedValue,
            currency: moeda,
            wallet: wallet
        });

        const wooviResponse = await fetch(`${WOOVI_API_URL}/api/v1/charge`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cleanApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pixData)
        });

        if (!wooviResponse.ok) {
            const errorText = await wooviResponse.text();
            let errorResponse;
            try { errorResponse = JSON.parse(errorText); } catch (e) { errorResponse = errorText; }

            logAPIError('error', 'Erro na API Woovi (Astro)', {
                service: 'Woovi',
                statusCode: wooviResponse.status,
                response: errorText
            });

            throw handleExternalAPIError('Woovi', wooviResponse.status, errorResponse, null);
        }

        const wooviData = await wooviResponse.json();

        // 🏛️ PERSISTÊNCIA SOBERANA (SQLite)
        try {
            createOrder({
                charge_id: id_transacao,
                amount_brl: validatedValue,
                product_ref: product_id || 'manual',
                customer_ref: `user_${wallet.substring(2, 10)}`,
                customer_wallet: wallet,
                status: 'CREATED',
                pix_qr: wooviData.qrCodeImage,
                pix_copy_paste: wooviData.brCode,
                checkout_url: wooviData.paymentLinkUrl || null,
                metadata: JSON.stringify({
                    woovi_id: wooviData.correlationID,
                    source: 'flowpay-sovereign-node'
                })
            });
            secureLog('info', 'Pedido salvo no SQLite (Railway Bridge) ✅', { id_transacao });
        } catch (dbError) {
            secureLog('error', 'Falha no SQLite Bridge', { error: dbError.message, id_transacao });
        }

        const responseData = {
            success: true,
            pix_data: {
                qr_code: wooviData.qrCodeImage,
                br_code: wooviData.brCode,
                correlation_id: wooviData.correlationID,
                value: validatedValue,
                expires_at: wooviData.expiresAt,
                status: wooviData.status
            },
            wallet,
            moeda,
            id_transacao
        };

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        secureLog('error', 'Erro na API Astro create-charge', { error: error.message });

        const statusCode = error.statusCode || 500;
        const errorBody = {
            success: false,
            error: error.message || 'Erro interno no servidor',
            type: error.type || 'INTERNAL_ERROR'
        };

        return new Response(JSON.stringify(errorBody), {
            status: statusCode,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }
};

// Handle OPTIONS for CORS
export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, {
        status: 204,
        headers
    });
};
