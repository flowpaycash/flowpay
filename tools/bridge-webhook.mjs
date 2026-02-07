import fs from 'fs';
import path from 'path';

function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                process.env[key.trim()] = valueParts.join('=').trim();
            }
        });
    }
}

loadEnv();

const API_KEY = process.env.WOOVI_API_KEY;
const TARGET_URL = 'https://flowpay.cash/api/webhook';
// Nota: Woovi API espera a URL encodada no query param
const BASE_URL = `https://api.woovi.com/api/v1/webhook?url=${encodeURIComponent(TARGET_URL)}`;

async function findAndDeleteWebhook() {
    if (!API_KEY) {
        console.error('❌ Erro: WOOVI_API_KEY não encontrada no .env');
        return;
    }

    console.log(`🔍 Procurando webhook antigo (Netlify)...`);

    try {
        const response = await fetch(BASE_URL, {
            method: 'GET',
            headers: {
                'Authorization': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            console.error('❌ Erro 401: Sua WOOVI_API_KEY parece inválida ou sem permissão para Webhooks.');
            console.log('Verifique se você copiou o "App ID" (JWT) da Woovi.');
            return;
        }

        const data = await response.json();

        if (data.webhooks && data.webhooks.length > 0) {
            const webhook = data.webhooks[0];
            console.log(`✅ Webhook encontrado! ID: ${webhook.id}`);

            console.log('🔄 Substituindo pelo novo (Railway)...');

            const newUrl = 'https://flowpay-production-10d8.up.railway.app/api/webhook';

            // Criar o novo primeiro (segurança)
            const createResponse = await fetch('https://api.woovi.com/api/v1/webhook', {
                method: 'POST',
                headers: {
                    'Authorization': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    webhook: {
                        name: 'FlowPay Railway',
                        event: 'OPENPIX:CHARGE_COMPLETED',
                        url: newUrl,
                        isActive: true
                    }
                })
            });

            if (createResponse.ok) {
                console.log('✅ Novo webhook Railway criado com sucesso!');

                // Deletar o antigo
                const deleteResponse = await fetch(`https://api.woovi.com/api/v1/webhook/${webhook.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': API_KEY
                    }
                });

                if (deleteResponse.ok) {
                    console.log('✅ Webhook antigo (Netlify) removido!');
                }
            } else {
                const err = await createResponse.json();
                console.error('❌ Falha ao criar novo webhook:', err);
            }

        } else {
            console.log('ℹ️ O webhook do Netlify não foi encontrado via API. Pode ser que ele tenha sido criado manualmente como um "Plugin" ou sob outra conta.');
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

findAndDeleteWebhook();
