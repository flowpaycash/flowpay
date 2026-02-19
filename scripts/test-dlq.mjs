import { triggerNeobotUnlock } from '../src/services/api/neobot-bridge.mjs';
import { createOrder, updateOrderStatus } from '../src/services/database/sqlite.mjs';

async function testDLQ() {
    console.log('🧪 Iniciando teste de falha na Bridge e gravação em DLQ...');

    const testId = `test_${Date.now()}`;

    // 1. Criar ordem de teste
    try {
        createOrder({
            charge_id: testId,
            amount_brl: 100,
            product_ref: 'basic_pass',
            customer_ref: 'test_user',
            status: 'PIX_PAID'
        });
        console.log(`✅ Ordem de teste criada: ${testId}`);
    } catch (e) {
        console.error('❌ Falha ao criar ordem:', e.message);
        return;
    }

    // 2. Tentar disparar a bridge (DEVE FALHAR pois NEOBOT_URL não está configurado corretamente para este teste)
    process.env.NEOBOT_URL = 'http://invalid-url-for-test.local';

    console.log('⏳ Tentando disparar a bridge (isso vai tentar 3 vezes com retry)...');
    const result = await triggerNeobotUnlock(testId, 'test_user_email');

    if (!result.success) {
        console.log('✅ Bridge falhou como esperado.');
        console.log(`❌ Erro reportado: ${result.error}`);

        // 3. Verificar se o arquivo DLQ existe e contém a entrada
        const fs = await import('fs');
        const path = await import('path');
        const dlqPath = path.join(process.cwd(), 'data', 'flowpay', 'failed_provisions.jsonl');

        if (fs.existsSync(dlqPath)) {
            const content = fs.readFileSync(dlqPath, 'utf-8');
            if (content.includes(testId)) {
                console.log('🏆 SUCESSO: A falha foi registrada corretamente no DLQ (failed_provisions.jsonl)');
            } else {
                console.log('❌ O arquivo DLQ existe mas não encontrei o ID de teste nele.');
            }
        } else {
            console.log('❌ Arquivo DLQ não foi encontrado em:', dlqPath);
        }
    } else {
        console.log('❌ ERRO: A bridge reportou sucesso inesperadamente!');
    }
}

testDLQ().catch(console.error);
