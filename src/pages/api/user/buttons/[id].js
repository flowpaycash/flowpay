/**
 * DELETE /api/user/buttons/[id]  — Remove botao de pagamento
 * PATCH  /api/user/buttons/[id]  — Atualiza titulo/descricao/valor de um botao
 *
 * Requer sessao autenticada.
 * Apenas o dono do botao pode alterá-lo.
 */
import { getCorsHeaders, secureLog } from '../../../../services/api/config.mjs';
import {
    getUserByEmail,
    getPaymentButton,
} from '../../../../services/database/sqlite.mjs';
import { verifySessionToken } from '../../../../services/auth/session.mjs';

// ── Auth helper ──────────────────────────────────────────────────────────────

function validateUserSession(request) {
    const cookies = request.headers.get('cookie') || '';
    const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('flowpay_session='));

    let token = null;
    if (sessionCookie) {
        token = sessionCookie.split('=')[1];
    } else {
        token = request.headers.get('x-user-token');
    }

    if (!token) return null;

    const payload = verifySessionToken(token);
    if (!payload) {
        secureLog('warn', 'Sessão inválida em buttons/[id]', { token: token.substring(0, 10) + '...' });
        return null;
    }

    return { email: payload.email.toLowerCase().trim(), token };
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export const DELETE = async ({ request, params }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    const { id: buttonId } = params;

    const session = validateUserSession(request);
    if (!session) {
        return new Response(JSON.stringify({ error: 'Autenticação necessária.' }), { status: 401, headers });
    }

    if (!buttonId || typeof buttonId !== 'string') {
        return new Response(JSON.stringify({ error: 'ID do botão inválido.' }), { status: 400, headers });
    }

    try {
        const user = getUserByEmail(session.email);
        if (!user || user.status !== 'APPROVED') {
            return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), { status: 403, headers });
        }

        const button = getPaymentButton(buttonId);
        if (!button) {
            return new Response(JSON.stringify({ error: 'Botão não encontrado.' }), { status: 404, headers });
        }

        // Confere ownership
        if (button.user_id !== user.id) {
            secureLog('warn', 'Tentativa de deletar botão de outro usuário', {
                requesterId: user.id,
                buttonOwnerId: button.user_id,
                buttonId,
            });
            return new Response(JSON.stringify({ error: 'Acesso negado.' }), { status: 403, headers });
        }

        // Soft-delete: marca como inativo (preserva histórico de pagamentos)
        const { getDatabase } = await import('../../../../services/database/sqlite.mjs');
        const db = getDatabase();
        db.prepare(
            'UPDATE payment_buttons SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE button_id = ? AND user_id = ?'
        ).run(buttonId, user.id);

        secureLog('info', 'Botão desativado (soft-delete)', { buttonId, userId: user.id });

        return new Response(JSON.stringify({ success: true, message: 'Botão removido com sucesso.' }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        secureLog('error', 'DELETE /api/user/buttons/[id] error', { error: error.message });
        return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers });
    }
};

// ── PATCH ─────────────────────────────────────────────────────────────────────

export const PATCH = async ({ request, params }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    const { id: buttonId } = params;

    const session = validateUserSession(request);
    if (!session) {
        return new Response(JSON.stringify({ error: 'Autenticação necessária.' }), { status: 401, headers });
    }

    if (!buttonId || typeof buttonId !== 'string') {
        return new Response(JSON.stringify({ error: 'ID do botão inválido.' }), { status: 400, headers });
    }

    try {
        const user = getUserByEmail(session.email);
        if (!user || user.status !== 'APPROVED') {
            return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), { status: 403, headers });
        }

        const button = getPaymentButton(buttonId);
        if (!button) {
            return new Response(JSON.stringify({ error: 'Botão não encontrado.' }), { status: 404, headers });
        }

        if (button.user_id !== user.id) {
            secureLog('warn', 'Tentativa de editar botão de outro usuário', {
                requesterId: user.id,
                buttonOwnerId: button.user_id,
                buttonId,
            });
            return new Response(JSON.stringify({ error: 'Acesso negado.' }), { status: 403, headers });
        }

        const body = await request.json();
        const { title, description, amount_brl, amount_fixed } = body;

        // Validações
        const updates = [];
        const values = [];

        if (title !== undefined) {
            if (typeof title !== 'string' || title.trim().length < 2) {
                return new Response(JSON.stringify({ error: 'Título inválido (mínimo 2 caracteres).' }), { status: 400, headers });
            }
            updates.push('title = ?');
            values.push(title.trim().substring(0, 100));
        }

        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description ? description.trim().substring(0, 500) : null);
        }

        if (amount_brl !== undefined) {
            const parsed = parseFloat(amount_brl);
            if (isNaN(parsed) || parsed <= 0) {
                return new Response(JSON.stringify({ error: 'Valor inválido.' }), { status: 400, headers });
            }
            updates.push('amount_brl = ?');
            values.push(parsed);
        }

        if (amount_fixed !== undefined) {
            updates.push('amount_fixed = ?');
            values.push(amount_fixed ? 1 : 0);
        }

        if (updates.length === 0) {
            return new Response(JSON.stringify({ error: 'Nenhum campo para atualizar.' }), { status: 400, headers });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(buttonId, user.id);

        const { getDatabase } = await import('../../../../services/database/sqlite.mjs');
        const db = getDatabase();
        db.prepare(
            `UPDATE payment_buttons SET ${updates.join(', ')} WHERE button_id = ? AND user_id = ?`
        ).run(...values);

        // Retorna o botão atualizado
        const updatedButton = getPaymentButton(buttonId);

        secureLog('info', 'Botão atualizado via PATCH', { buttonId, userId: user.id, fields: Object.keys(body) });

        return new Response(JSON.stringify({ success: true, button: updatedButton }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        secureLog('error', 'PATCH /api/user/buttons/[id] error', { error: error.message });
        return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers });
    }
};

// ── OPTIONS (CORS preflight) ──────────────────────────────────────────────────

export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, { status: 204, headers });
};
