import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DB_PATH = '/usr/local/projects/flowpay/data/flowpay/flowpay.db';
const BACKUP_DIR = '/usr/local/projects/flowpay/backups';

async function performBackup() {
    console.log('📦 Iniciando backup do banco de dados (Soberania de Dados)...');

    if (!fs.existsSync(DB_PATH)) {
        console.error('❌ Banco de dados não encontrado em:', DB_PATH);
        return;
    }

    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `flowpay-backup-${timestamp}.sqlite`);

    try {
        // Usar o comando nativo do sqlite3 para garantir integridade (evita erros se o DB estiver sendo escrito)
        execSync(`sqlite3 "${DB_PATH}" ".backup '${backupPath}'"`);

        // Compactar para economizar espaço
        execSync(`gzip "${backupPath}"`);

        console.log(`✅ Backup concluído com sucesso!`);
        console.log(`📂 Arquivo: ${backupPath}.gz`);

        // Rodar limpeza (manter apenas os últimos 7 backups)
        cleanupOldBackups();

    } catch (err) {
        console.error('❌ Falha ao realizar backup:', err.message);
    }
}

function cleanupOldBackups() {
    const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.gz'))
        .map(f => ({
            name: f,
            path: path.join(BACKUP_DIR, f),
            mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

    if (files.length > 7) {
        console.log('🧹 Limpando backups antigos...');
        files.slice(7).forEach(f => {
            fs.unlinkSync(f.path);
            console.log(`🗑️ Removido: ${f.name}`);
        });
    }
}

performBackup();
