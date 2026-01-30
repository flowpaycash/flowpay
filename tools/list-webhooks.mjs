import fs from 'fs';
import path from 'path';

// Função simples para ler .env sem dependência externa
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
const BASE_URL = 'https://api.woovi.com/api/v1/webhook';

async function listWebhooks() {
    if (!API_KEY) {
        console.error('❌ Erro: WOOVI_API_KEY não encontrada no .env');
        return;
    }

    console.log('🔍 Buscando webhooks ativos na Woovi...');

    try {
        const response = await fetch(BASE_URL, {
            method: 'GET',
            headers: {
                'Authorization': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro API: ${response.status}`);
        }

        const data = await response.json();
        console.log('\n========= Webhooks Encontrados =========');

        if (data.webhooks && data.webhooks.length > 0) {
            data.webhooks.forEach((w, index) => {
                console.log(`\n[${index + 1}] ID: ${w.id}`);
                console.log(`    Nome: ${w.name}`);
                console.log(`    URL:  ${w.url}`);
                console.log(`    Evento: ${w.event}`);
                console.log(`    Ativo: ${w.isActive}`);
            });
            console.log('\n========================================');
        } else {
            console.log('Nenhum webhook encontrado.');
        }

    } catch (error) {
        console.error('❌ Falha ao listar webhooks:', error.message);
    }
}

listWebhooks();
