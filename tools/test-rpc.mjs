// Usando fetch nativo do Node 18+

async function testRPC() {
    const url = 'https://fabled-prettiest-orb.base-mainnet.quiknode.pro/507a237542c4361a991aac9600dd66497fef4fe9/';

    console.log(`🔗 Testando RPC: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: 1
            })
        });

        if (!response.ok) {
            console.error(`❌ Erro HTTP: ${response.status}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log('✅ RPC Respondeu com Sucesso!');
        console.log('📦 Bloco Atual (Hex):', data.result);
        console.log('📦 Bloco Atual (Dec):', parseInt(data.result, 16));
    } catch (error) {
        console.error('❌ Erro na conexão:', error.message);
    }
}

testRPC();
