import { getCorsHeaders } from '../../../services/api/config.mjs';
import { getUserByEmail } from '../../../services/database/sqlite.mjs';

// GET /api/user/status?email=... - check user approval status
export const GET = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    try {
        const url = new URL(request.url);
        const email = url.searchParams.get('email');

        if (!email || !email.includes('@')) {
            return new Response(JSON.stringify({ error: 'E-mail inválido.' }), { status: 400, headers });
        }

        const user = getUserByEmail(email.toLowerCase().trim());

        if (!user) {
            return new Response(JSON.stringify({ found: false }), {
                status: 200,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            found: true,
            status: user.status,
            name: user.name,
            userId: user.id
        }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers });
    }
};

export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, { status: 204, headers });
};
