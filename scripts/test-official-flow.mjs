import crypto from 'crypto';
// Removendo dotenv para evitar erro de pacote não encontrado

/**
 * Script de Teste de Stress e Integração: FlowPay Official Domain
 * Este script simula o fluxo completo da Woovi -> FlowPay -> Nexus/PoE
 */

const DOMAIN = 'https://flowpay.cash';
const WEBHOOK_ENDPOINT = `${DOMAIN}/api/webhook`;
const SECRET = process.env.WOOVI_WEBHOOK_SECRET;

if (!SECRET) {
    console.error('❌ ERRO: WOOVI_WEBHOOK_SECRET não encontrado no .env local.');
    process.exit(1);
}

async function simulateWooviPayment(correlationID, amountCents = 1000) {
    console.log(`\n🚀 Iniciando simulação para: ${correlationID}`);

    const payload = {
        event: 'charge.confirmed',
        data: {
            charge: {
                correlationID: correlationID,
                value: amountCents,
                status: 'confirmed',
                paidAt: new Date().toISOString(),
                customer: {
                    email: 'teste_soberano@neoprotocol.space',
                    name: 'Testador FlowPay'
                }
            }
        }
    };

    const body = JSON.stringify(payload);

    // Gerar assinatura HMAC-SHA256 (Base64) como a Woovi faz
    const hmac = crypto.createHmac('sha256', SECRET);
    const signature = hmac.update(body).digest('base64');

    console.log(`📡 Enviando webhook para ${WEBHOOK_ENDPOINT}...`);

    try {
        const response = await fetch(WEBHOOK_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-woovi-signature': signature
            },
            body: body
        });

        const result = await response.json();

        if (response.ok) {
            console.log(`✅ Sucesso! Status: ${response.status}`);
            console.log('📦 Resposta:', JSON.stringify(result, null, 2));
        } else {
            console.error(`❌ Falha! Status: ${response.status}`);
            console.error('📦 Erro:', JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.error('🔥 Erro na requisição:', error.message);
    }
}

// Rodar múltiplos testes com diferentes IDs
async function runSuite() {
    const testIds = [
        `TEST_OFFICIAL_${Math.floor(Math.random() * 10000)}`,
        `TEST_OFFICIAL_${Math.floor(Math.random() * 10000)}`
    ];

    for (const id of testIds) {
        await simulateWooviPayment(id);
        // Pequeno delay entre testes
        await new Promise(r => setTimeout(r, 1000));
    }
}

console.log(`🛠️ Preparando testes contra ${DOMAIN}`);
runSuite().then(() => console.log('\n🏁 Suite de testes finalizada.'));
