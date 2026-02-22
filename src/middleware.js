import { config } from './services/api/config.mjs';

/**
 * ════════════════════════════════════════════════════════════════
 * 🛡️ FlowPay Global Security Middleware
 * ════════════════════════════════════════════════════════════════
 * Applies server-side security headers to ALL responses.
 *
 * CSP is set here as an HTTP header (not HTML <meta> tag).
 * HTTP headers take precedence and cannot be bypassed client-side.
 * ════════════════════════════════════════════════════════════════
 */

// ── Content Security Policy ───────────────────────────────────────────────────

/**
 * Builds the CSP header value.
 * Nonces are not used here — Sentry, Cloudflare Insights and
 * QuickNode are whitelisted by domain instead, for simplicity.
 *
 * Adjust the report-uri if you have a CSP reporting endpoint.
 */
function buildCSP() {
    const isDev = process.env.NODE_ENV === 'development';

    const directives = {
        'default-src': ["'self'"],
        'script-src': [
            "'self'",
            // Sentry CDN
            'https://browser.sentry-cdn.com',
            'https://js.sentry-cdn.com',
            // Cloudflare Insights
            'https://static.cloudflareinsights.com',
            // Dynamic Labs (wallet connect)
            'https://app.dynamic.xyz',
            'https://cdn.dynamic.xyz',
            // Dev mode allows eval for HMR
            ...(isDev ? ["'unsafe-eval'", "'unsafe-inline'"] : ["'unsafe-inline'"]),
        ],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:', 'blob:'],
        'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
        'connect-src': [
            "'self'",
            // Sentry DSN
            'https://*.sentry.io',
            'https://sentry.io',
            // Woovi / OpenPix
            'https://api.woovi.com',
            'https://api.openpix.com.br',
            // QuickNode
            'https://*.quiknode.pro',
            'https://*.quicknode.com',
            // Resend email
            'https://api.resend.com',
            // Dynamic Labs
            'https://api.dynamic.xyz',
            'https://*.dynamic.xyz',
            // Cloudflare
            'https://cloudflareinsights.com',
            // WebSocket (dev)
            ...(isDev ? ['ws://localhost:*', 'wss://localhost:*'] : []),
        ],
        'frame-src': ["'none'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'manifest-src': ["'self'"],
        'worker-src': ["'self'", 'blob:'],
        // Envia relatórios de violação CSP para Sentry (se DSN disponível)
        ...(process.env.SENTRY_DSN ? {
            'report-uri': [`https://sentry.io/api/${process.env.SENTRY_PROJECT_ID || 'flowpay'}/security/?sentry_key=${process.env.SENTRY_DSN?.split('@')[0]?.split('//')[1] || ''}`],
        } : {}),
    };

    return Object.entries(directives)
        .map(([key, values]) => `${key} ${values.join(' ')}`)
        .join('; ');
}

const CSP_VALUE = buildCSP();

// ── Middleware ────────────────────────────────────────────────────────────────

export const onRequest = async (context, next) => {
    const response = await next();

    // 1. Aplica headers de segurança globais (HSTS, X-Frame-Options, etc.)
    Object.entries(config.security.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    // 2. CSP como HTTP header (Item 8 do NEXTSTEPS.md)
    //    Somente para respostas HTML — evita sobrescrever respostas JSON/binary
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
        response.headers.set('Content-Security-Policy', CSP_VALUE);
    }

    return response;
};

