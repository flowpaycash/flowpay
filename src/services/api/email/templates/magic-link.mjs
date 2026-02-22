import { emailTemplate } from './base.mjs';

/**
 * Link Mágico para login passwordless.
 * @param {object} params
 * @param {string} params.magicLink - URL completa do link de login
 * @returns {string} HTML formatado
 */
export const magicLinkTemplate = ({ magicLink }) => emailTemplate({
    badge: 'Acesso Seguro',
    badgeColor: 'blue',
    title: 'Seu link de acesso chegou',
    body: `
        <p style="margin:0 0 16px">
            Você solicitou um link para acessar sua conta no FlowPay. 
            Clique no botão abaixo para entrar agora.
        </p>
        <p style="margin:0;color:rgba(255,255,255,0.4);font-size:0.85rem">
            Este link é válido por 30 minutos e expira após o primeiro uso.
        </p>
    `,
    cta: {
        label: 'Acessar Conta',
        url: magicLink
    },
    footer: 'Se você não solicitou este link, por favor ignore este e-mail.'
});
