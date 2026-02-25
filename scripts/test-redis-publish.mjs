import { Redis } from 'ioredis';

async function testPublish() {
    const redisUrl = "redis://default:fAWOzuLwvVSc9zaWBu233UbOZmdYhRuK@redis-19497.crce207.sa-east-1-2.ec2.cloud.redislabs.com:19497";
    const redis = new Redis(redisUrl);

    console.log('🚀 Iniciando disparo de teste...');

    const testData = {
        charge_id: 'test_id_architect_validation',
        status: 'PIX_PAID',
        updated_at: new Date().toISOString(),
        message: 'NΞØ Protocol Arch Validation'
    };

    try {
        await redis.publish('charge_update:test_id_architect_validation', JSON.stringify(testData));
        console.log('✅ Mensagem publicada com sucesso no canal: charge_update:test_id_architect_validation');
        console.log('Dados enviados:', testData);
    } catch (err) {
        console.error('❌ Erro ao publicar:', err);
    } finally {
        await redis.quit();
    }
}

testPublish();
