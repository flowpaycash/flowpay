import { emailTemplate } from './base.mjs';

/**
 * Template de e-mail para Notificação do Vendedor (Novo Pagamento)
 * @param {object} params
 * @param {string} params.sellerName - Nome do vendedor
 * @param {number} params.amount  - Valor da transação
 * @param {string} params.productName - Nome do produto/botão
 * @param {string} params.customerName - Nome do comprador (se disponível)
 * @returns {string} HTML formatado
 */
export const vendedorNotificacaoTemplate = ({ sellerName, amount, productName, customerName }) => emailTemplate({
    badge: 'Novo Pagamento',
    badgeColor: 'blue',
    title: `R$ ${amount.toFixed(2)} na conta! 💸`,
    body: `
        <p style="margin:0 0 24px">
            Olá ${sellerName},<br>
            Você acabou de receber um novo pagamento via FlowPay.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0"
               style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden">
            <tr>
                <td style="padding:14px 20px;color:rgba(255,255,255,0.4);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid rgba(255,255,255,0.05)">Produto</td>
                <td style="padding:14px 20px;font-size:0.9rem;border-bottom:1px solid rgba(255,255,255,0.05)">${productName}</td>
            </tr>
            <tr>
                <td style="padding:14px 20px;color:rgba(255,255,255,0.4);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid rgba(255,255,255,0.05)">Valor</td>
                <td style="padding:14px 20px;font-weight:700;color:#00c864;border-bottom:1px solid rgba(255,255,255,0.05)">R$ ${amount.toFixed(2)}</td>
            </tr>
            ${customerName ? `
            <tr>
                <td style="padding:14px 20px;color:rgba(255,255,255,0.4);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px">Comprador</td>
                <td style="padding:14px 20px;font-size:0.9rem">${customerName}</td>
            </tr>
            ` : ''}
        </table>
    `,
    cta: {
        label: 'Ver no Dashboard →',
        url: 'https://flowpay.cash/dashboard',
    },
    footer: 'FlowPay Autonomous Protocol · No Banks, Just Flow.',
});
