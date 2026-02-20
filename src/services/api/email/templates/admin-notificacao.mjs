import { emailTemplate } from './base.mjs';

/**
 * Email de notificação para o admin — novo cadastro.
 * @param {object} params
 * @param {string} params.name          - Nome do usuário
 * @param {string} params.email         - E-mail do usuário
 * @param {string} params.businessType  - Tipo de uso
 * @param {string} [params.phone]       - Telefone
 * @param {string} params.registeredAt  - Data/hora formatada
 * @returns {string} HTML formatado
 */
export const adminNovoCadastroTemplate = ({ name, email, businessType, phone, registeredAt }) =>
    emailTemplate({
        badge: 'Novo cadastro',
        badgeColor: 'orange',
        title: name,
        body: `
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;font-size:0.88rem">
                <tr>
                    <td style="padding:12px 18px;color:rgba(255,255,255,0.4);width:38%;border-bottom:1px solid rgba(255,255,255,0.05)">E-mail</td>
                    <td style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.05)">${email}</td>
                </tr>
                <tr>
                    <td style="padding:12px 18px;color:rgba(255,255,255,0.4);border-bottom:1px solid rgba(255,255,255,0.05)">Tipo de uso</td>
                    <td style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.05)">${businessType}</td>
                </tr>
                <tr>
                    <td style="padding:12px 18px;color:rgba(255,255,255,0.4);border-bottom:1px solid rgba(255,255,255,0.05)">Telefone</td>
                    <td style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.05)">${phone || '—'}</td>
                </tr>
                <tr>
                    <td style="padding:12px 18px;color:rgba(255,255,255,0.4)">Recebido em</td>
                    <td style="padding:12px 18px">${registeredAt}</td>
                </tr>
            </table>
        `,
        cta: {
            label: 'Revisar no painel →',
            url: 'https://flowpay.cash/admin/users',
        },
    });

/**
 * Email de notificação para o admin — usuário aprovado.
 * @param {object} params
 * @param {string} params.name       - Nome do usuário
 * @param {string} params.email      - E-mail do usuário
 * @param {string} params.approvedAt - Data/hora formatada
 * @returns {string} HTML formatado
 */
export const adminAprovacaoTemplate = ({ name, email, approvedAt }) =>
    emailTemplate({
        badge: '✅ Cadastro aprovado',
        badgeColor: 'green',
        title: name,
        body: `
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;font-size:0.88rem">
                <tr>
                    <td style="padding:12px 18px;color:rgba(255,255,255,0.4);width:38%;border-bottom:1px solid rgba(255,255,255,0.05)">E-mail</td>
                    <td style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.05)">${email}</td>
                </tr>
                <tr>
                    <td style="padding:12px 18px;color:rgba(255,255,255,0.4)">Aprovado em</td>
                    <td style="padding:12px 18px">${approvedAt}</td>
                </tr>
            </table>
        `,
    });

/**
 * Email de notificação para o admin — usuário rejeitado.
 * @param {object} params
 * @param {string} params.name       - Nome do usuário
 * @param {string} params.email      - E-mail do usuário
 * @param {string} params.reason     - Motivo da rejeição
 * @param {string} params.rejectedAt - Data/hora formatada
 * @returns {string} HTML formatado
 */
export const adminRejeicaoTemplate = ({ name, email, reason, rejectedAt }) =>
    emailTemplate({
        badge: '❌ Cadastro rejeitado',
        badgeColor: 'red',
        title: name,
        body: `
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;font-size:0.88rem">
                <tr>
                    <td style="padding:12px 18px;color:rgba(255,255,255,0.4);width:38%;border-bottom:1px solid rgba(255,255,255,0.05)">E-mail</td>
                    <td style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.05)">${email}</td>
                </tr>
                <tr>
                    <td style="padding:12px 18px;color:rgba(255,255,255,0.4);border-bottom:1px solid rgba(255,255,255,0.05)">Motivo</td>
                    <td style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.05)">${reason}</td>
                </tr>
                <tr>
                    <td style="padding:12px 18px;color:rgba(255,255,255,0.4)">Rejeitado em</td>
                    <td style="padding:12px 18px">${rejectedAt}</td>
                </tr>
            </table>
        `,
    });
