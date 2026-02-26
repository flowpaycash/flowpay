export const GET = async ({ request }) => {
    // Generates the global configuration object dynamically from backend envs
    const config = {
        web3auth: {
            client_id: process.env.WEB3AUTH_CLIENT_ID || "",
            network: process.env.WEB3AUTH_NETWORK || "sapphire_mainnet"
        },
        crypto: {
            chainId: "0x89" // Polygon
        },
        infura: {
            // API key is proxied server-side — never exposed to browser
            bundlerEndpoint: process.env.INFURA_API_KEY ? '/api/infura-bundler' : ''
        }
    };

    const jsContent = `window.NEO_CONFIG = ${JSON.stringify(config, null, 2)};`;

    return new Response(jsContent, {
        status: 200,
        headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=60' // 1 minute cache
        }
    });
};
