import { listProducts } from '../../services/database/sqlite.mjs';
import { getCorsHeaders } from '../../services/api/config.mjs';

export const GET = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    try {
        const products = listProducts();

        return new Response(JSON.stringify(products), {
            status: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers
        });
    }
};
