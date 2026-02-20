import { emailTemplate } from './base.mjs';

/**
 * Email de aprovação de conta para o usuário.
 * @param {object} params
 * @param {string} params.name - Nome do usuário
 * @returns {string} HTML formatado
 */
export const aprovacaoTemplate = ({ name }) => emailTemplate({
    badge: 'Conta aprovada',
    badgeColor: 'green',
    title: `Bem-vindo ao FlowPay, ${name}! 🎉`,
    body: `
        <p style="margin:0 0 16px">
            Sua conta foi aprovada. Agora você pode criar links de pagamento PIX, gerar embeds
            e acompanhar suas transações em tempo real pelo dashboard.
        </p>
        <p style="margin:0;color:rgba(255,255,255,0.35);font-size:0.85rem">
            Acesse o dashboard e configure seu primeiro link de pagamento.
        </p>
    `,
    cta: {
        label: 'Acessar Dashboard →',
        url: 'https://flowpay.cash/dashboard',
    },
});
