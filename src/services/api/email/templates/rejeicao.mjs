import { emailTemplate } from './base.mjs';

/**
 * Email de rejeição de cadastro para o usuário.
 * @param {object} params
 * @param {string} params.name   - Nome do usuário
 * @param {string} [params.reason] - Motivo da rejeição (opcional)
 * @returns {string} HTML formatado
 */
export const rejeicaoTemplate = ({ name, reason }) => {
    const reasonHtml = reason && reason !== 'Reprovado pelo administrador'
        ? `<p style="margin:16px 0 0;padding:14px 16px;background:rgba(255,255,255,0.04);border-radius:8px;font-size:0.85rem;color:rgba(255,255,255,0.5)">
               <strong style="color:rgba(255,255,255,0.3);text-transform:uppercase;font-size:0.75rem;letter-spacing:0.5px">Motivo</strong><br/>
               ${reason}
           </p>`
        : '';

    return emailTemplate({
        badge: 'Cadastro não aprovado',
        badgeColor: 'red',
        title: `Olá, ${name}`,
        body: `
            <p style="margin:0">
                Infelizmente não foi possível aprovar seu cadastro no FlowPay no momento.
            </p>
            ${reasonHtml}
            <p style="margin:24px 0 0;color:rgba(255,255,255,0.35);font-size:0.85rem">
                Em caso de dúvidas, entre em contato com nosso suporte.
            </p>
        `,
    });
};
