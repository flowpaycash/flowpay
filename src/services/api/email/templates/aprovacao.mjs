import { emailTemplate } from './base.mjs';

/**
 * Email de aprovação de conta para o usuário.
 * @param {object} params
 * @param {string} params.name - Nome do usuário
 * @param {string} [params.loginUrl] - URL de login (magic link)
 * @param {number} [params.expiresHours] - Janela de validade do link
 * @returns {string} HTML formatado
 */
export const aprovacaoTemplate = ({ name, loginUrl, expiresHours = 24 }) =>
    emailTemplate({
        badge: 'Conta aprovada',
        badgeColor: 'green',
        title: `Bem-vindo ao FlowPay, ${name}! 🎉`,
        body: `
        <p style="margin:0 0 16px">
            Sua conta foi aprovada. Agora você pode criar links de pagamento PIX, gerar embeds
            e acompanhar suas transações em tempo real pelo dashboard.
        </p>
        <p style="margin:0;color:rgba(255,255,255,0.35);font-size:0.85rem">
            Seu acesso é sem senha. Use o botão abaixo para entrar com link mágico.
            O link expira em ${expiresHours < 1 ? Math.round(expiresHours * 60) + ' minutos' : expiresHours + 'h'}.
        </p>
    `,
        cta: {
            label: 'Entrar no Dashboard →',
            url: loginUrl || 'https://flowpay.cash/login',
        },
    });
