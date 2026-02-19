export const GET = async () => {
    return new Response(JSON.stringify({
        network: 'ethereum',
        chainId: 1,
        rpcUrl: 'https://rpc.ankr.com/eth'
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};
