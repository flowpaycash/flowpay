import { emailTemplate } from './base.mjs';

/**
 * Template de e-mail para Confirmação de Pagamento PIX
 * @param {object} params
 * @param {string} params.orderId - ID do pedido
 * @param {number} params.amount  - Valor da transação
 * @returns {string} HTML formatado
 */
export const paymentConfirmedTemplate = ({ orderId, amount }) => emailTemplate({
    badge: 'Pagamento confirmado',
    badgeColor: 'green',
    title: 'O Fluxo começou! 🚀',
    body: `
        <p style="margin:0 0 24px">
            Confirmamos seu pagamento via PIX. Sua liquidação já está sendo processada de forma autônoma.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0"
               style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden">
            <tr>
                <td style="padding:14px 20px;color:rgba(255,255,255,0.4);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid rgba(255,255,255,0.05)">ID do pedido</td>
                <td style="padding:14px 20px;font-family:monospace;font-size:0.9rem;border-bottom:1px solid rgba(255,255,255,0.05)">${orderId}</td>
            </tr>
            <tr>
                <td style="padding:14px 20px;color:rgba(255,255,255,0.4);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid rgba(255,255,255,0.05)">Valor pago</td>
                <td style="padding:14px 20px;font-weight:700;color:#00c864;border-bottom:1px solid rgba(255,255,255,0.05)">R$ ${amount.toFixed(2)}</td>
            </tr>
            <tr>
                <td style="padding:14px 20px;color:rgba(255,255,255,0.4);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px">Status</td>
                <td style="padding:14px 20px;font-weight:600;color:#00c864">CONCLUÍDO</td>
            </tr>
        </table>
    `,
    cta: {
        label: 'Ver meu Dashboard →',
        url: 'https://flowpay.cash/dashboard',
    },
    footer: 'E-mail automático do FlowPay Autonomous Protocol · NΞØ Protocol — No Banks, Just Flow.',
});
