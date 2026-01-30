import https from 'https';

const urlString = 'https://fabled-prettiest-orb.base-mainnet.quiknode.pro/507a237542c4361a991aac9600dd66497fef4fe9/';
const url = new URL(urlString);

const data = JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_blockNumber',
    params: [],
    id: 1
});

const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    },
    rejectUnauthorized: false // APENAS PARA DEBUG DE CONEXÃO
};

console.log(`📡 Tentando conexão direta via https module com ${url.hostname}...`);

const req = https.request(options, (res) => {
    console.log(`📊 Status: ${res.statusCode}`);

    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(body);
            console.log('✅ Resposta:', json);
            if (json.result) {
                console.log('📦 Bloco Atual:', parseInt(json.result, 16));
            }
        } catch (e) {
            console.log('❌ Falha ao parsear corpo:', body.substring(0, 100));
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Erro de requisição:', error.message);
});

req.write(data);
req.end();
