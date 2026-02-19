import { config } from './services/api/config.mjs';

/**
 * 🛡️ Global Security Middleware
 * Applies security headers to ALL responses.
 */
export const onRequest = async (context, next) => {
    const response = await next();

    // Apply security headers from central config
    Object.entries(config.security.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    // Special case for CSP (If not already set by layout meta tag)
    // We keep the layout meta tag for simplicity, but middleware is more reliable for server-side.

    return response;
};
