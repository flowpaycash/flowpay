import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { requireAdminSession, withAdminNoStoreHeaders } from '../../../services/api/admin-auth.mjs';
import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';

export const POST = async ({ request, cookies }) => {
    const headers = withAdminNoStoreHeaders({
        ...getCorsHeaders({ headers: Object.fromEntries(request.headers) }),
        'Content-Type': 'application/json'
    });

    if (!requireAdminSession(cookies)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    try {
        const scriptPath = path.join(process.cwd(), 'scripts', 'db-backup.mjs');

        secureLog('info', 'Admin: Iniciando backup manual do banco de dados');

        // Executar o script de backup
        const output = execSync(`node ${scriptPath}`).toString();

        // Encontrar o caminho do arquivo no output (exemplo: 📂 Arquivo: /.../flowpay-backup-X.sqlite.gz)
        const match = output.match(/📂 Arquivo: (.*\.gz)/);
        const backupFile = match ? match[1] : null;

        if (!backupFile || !fs.existsSync(backupFile)) {
            throw new Error('Backup file not created or not found');
        }

        const fileName = path.basename(backupFile);
        const fileBuffer = fs.readFileSync(backupFile);

        // Retornar o banco de dados como download
        return new Response(fileBuffer, {
            status: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/x-gzip',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'X-Backup-Success': 'true'
            }
        });

    } catch (err) {
        secureLog('error', 'Admin backup failed', { error: err.message });
        return new Response(JSON.stringify({ error: 'Falha ao realizar backup', detail: err.message }), {
            status: 500,
            headers
        });
    }
};
