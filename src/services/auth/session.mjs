import crypto from 'crypto';

export function signSessionToken(payload) {
    const secret = process.env.TOKEN_SECRET || process.env.FLOWPAY_JWT_SECRET;
    if (!secret) {
        // Fallback for dev, but in production this should throw
        if (process.env.NODE_ENV === 'production') {
            throw new Error('TOKEN_SECRET not configured in production');
        }
        return `dev-token.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
    }
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    return `${data}.${sig}`;
}

export function verifySessionToken(token) {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) {
        // Handle legacy dev token
        if (token.startsWith('dev-token.') && process.env.NODE_ENV !== 'production') {
            try {
                return JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            } catch { return null; }
        }
        return null;
    }

    const [data, sig] = parts;
    const secret = process.env.TOKEN_SECRET || process.env.FLOWPAY_JWT_SECRET;
    if (!secret) return null;

    const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');

    if (sig !== expectedSig) return null;

    try {
        const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
        // Check expiration
        if (payload.exp && payload.exp < Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}
