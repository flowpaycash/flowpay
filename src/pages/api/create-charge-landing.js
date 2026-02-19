// 🏪 FLOWPay - Create Charge Landing (Fiat-Only)
// Endpoint para checkout via Landing Page: CPF + Email → Wallet Abstraction → PIX
// Aceita dados Web2 (CPF/Email) e gera smart wallet automaticamente via Account Abstraction

import { applyRateLimit } from '../../services/api/rate-limiter.mjs';
import { getCorsHeaders, secureLog, logPixTransaction, logAPIError } from '../../services/api/config.mjs';
import {
    handleExternalAPIError,
    FlowPayError,
    ERROR_TYPES
} from '../../services/api/error-handler.mjs';
import { validateData, sanitizeData } from '../../services/api/validation-middleware.mjs';
import { createOrder } from '../../services/database/sqlite.mjs';

/**
 * Gera wallet determinística a partir do CPF usando Account Abstraction.
 * Se o SmartWalletService não estiver configurado, usa um endereço derivado do CPF como fallback.
 */
async function resolveWalletFromCPF(cpf) {
    try {
        const { getSmartWalletService } = await import('../../../services/wallet/smart-account.js');
        const smartWallet = getSmartWalletService();

        if (smartWallet.isConfigured()) {
            const result = await smartWallet.createWallet(cpf);
            secureLog('info', 'Landing: Smart Account criada via AA', {
                cpf_hash: cpf.substring(0, 3) + '***',
                wallet: result.address ? `${result.address.slice(0, 10)}...` : 'unknown'
            });
            return result.address;
        }
    } catch (err) {
        secureLog('warn', 'Landing: SmartWalletService indisponível, usando fallback', {
            error: err.message
        });
    }

    // Fallback: gerar endereço determinístico a partir do CPF (para manter compatibilidade)
    const { createHash } = await import('crypto');
    const hash = createHash('sha256').update(`flowpay-landing-${cpf}`).digest('hex');
    const fallbackAddress = '0x' + hash.substring(0, 40);
    secureLog('info', 'Landing: Usando wallet fallback (hash CPF)', {
        cpf_hash: cpf.substring(0, 3) + '***'
    });
    return fallbackAddress;
}

export const POST = async ({ request, clientAddress }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    try {
        // 🚦 Rate Limiting
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

        // 2. Parse & Validate (Landing schema: CPF + Email, sem wallet)
        const rawBody = await request.json();
        validateData(rawBody, 'createLandingCharge');

        const sanitizedData = sanitizeData(rawBody);
        const {
            amount_brl,
            product_ref,
            customer_cpf,
            customer_email,
            customer_name
        } = sanitizedData;

        const validatedValue = parseFloat(amount_brl);

        // 3. Resolve Wallet via Account Abstraction
        const cpfClean = customer_cpf.replace(/\D/g, '');
        const wallet = await resolveWalletFromCPF(cpfClean);

        // 4. Generate unique transaction ID
        const id_transacao = `landing_${Date.now()}_${cpfClean.substring(0, 4)}`;

        // 5. Woovi API - Create PIX Charge
        const WOOVI_API_KEY = process.env.WOOVI_API_KEY;
        const WOOVI_API_URL = process.env.WOOVI_API_URL || 'https://api.woovi.com';

        if (!WOOVI_API_KEY) {
            throw new Error('Configuração da API Woovi não encontrada');
        }

        const cleanApiKey = WOOVI_API_KEY.trim();

        const pixData = {
            correlationID: id_transacao,
            value: Math.round(validatedValue * 100), // Woovi expects cents
            expiresIn: 3600,
            customer: {
                name: customer_name || undefined,
                email: customer_email,
                taxID: cpfClean
            },
            additionalInfo: [
                { key: 'wallet', value: wallet },
                { key: 'product_ref', value: product_ref },
                { key: 'source', value: 'landing-page' }
            ]
        };

        logPixTransaction('info', 'Landing API: Criando cobrança PIX', {
            id: id_transacao,
            amount: validatedValue,
            product: product_ref,
            cpf_hash: cpfClean.substring(0, 3) + '***'
        });

        const wooviResponse = await fetch(`${WOOVI_API_URL}/api/v1/charge`, {
            method: 'POST',
            headers: {
                'Authorization': cleanApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pixData),
            signal: AbortSignal.timeout(15000)
        });

        if (!wooviResponse.ok) {
            const errorText = await wooviResponse.text();
            let errorResponse;
            try { errorResponse = JSON.parse(errorText); } catch (e) { errorResponse = errorText; }

            logAPIError('error', 'Erro na API Woovi (Landing)', {
                service: 'Woovi',
                statusCode: wooviResponse.status,
                response: errorText
            });

            throw handleExternalAPIError('Woovi', wooviResponse.status, errorResponse, null);
        }

        const wooviData = await wooviResponse.json();

        // 6. 🏛️ PERSISTÊNCIA SOBERANA (SQLite) — com dados do comprador
        try {
            createOrder({
                charge_id: id_transacao,
                amount_brl: validatedValue,
                product_ref: product_ref,
                customer_ref: `cpf_${cpfClean.substring(0, 6)}`,
                customer_wallet: wallet,
                customer_cpf: cpfClean,
                customer_email: customer_email,
                customer_name: customer_name || null,
                status: 'CREATED',
                pix_qr: wooviData.charge?.qrCodeImage || wooviData.qrCodeImage,
                pix_copy_paste: wooviData.brCode || wooviData.charge?.brCode,
                checkout_url: wooviData.paymentLinkUrl || wooviData.charge?.paymentLinkUrl || null,
                metadata: JSON.stringify({
                    woovi_id: wooviData.correlationID,
                    source: 'landing-page',
                    wallet_type: 'account-abstraction'
                })
            });
            secureLog('info', 'Landing: Pedido salvo no SQLite ✅', { id_transacao });
        } catch (dbError) {
            secureLog('error', 'Landing: Falha no SQLite', { error: dbError.message, id_transacao });
        }

        // 7. Response para o frontend (formato compatível com a landing)
        const responseData = {
            success: true,
            charge: {
                charge_id: id_transacao,
                qr_code: wooviData.charge?.qrCodeImage || wooviData.qrCodeImage,
                pix_copy_paste: wooviData.brCode || wooviData.charge?.brCode,
                value: validatedValue,
                expires_at: wooviData.expiresAt || wooviData.charge?.expiresDate,
                status: wooviData.status || wooviData.charge?.status
            },
            wallet: wallet
        };

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        secureLog('error', 'Landing API: Erro no create-charge-landing', { error: error.message });

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
