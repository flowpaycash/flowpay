/**
 * Template de e-mail para Confirmação de Pagamento
 * @param {object} params
 * @param {string} params.orderId - ID do pedido
 * @param {number} params.amount - Valor da transação
 * @returns {string} HTML formatado
 */
export const paymentConfirmedTemplate = ({ orderId, amount }) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 20px; }
        .container { max-width: 600px; margin: auto; background: #1a1a1a; padding: 40px; border-radius: 16px; border: 1px solid #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { color: #ff007a; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
        .status-badge { display: inline-block; background: rgba(0, 255, 122, 0.1); color: #00ff7a; padding: 8px 16px; border-radius: 20px; font-size: 14px; margin-bottom: 20px; }
        h1 { color: #ffffff; font-size: 28px; margin-bottom: 10px; }
        p { color: #b3b3b3; line-height: 1.6; }
        .order-details { background: #000; padding: 20px; border-radius: 12px; margin: 30px 0; border: 1px solid #1a1a1a; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #1a1a1a; padding-bottom: 10px; }
        .detail-label { color: #666; font-size: 13px; }
        .detail-value { color: #fff; font-weight: 500; font-family: monospace; }
        .footer { text-align: center; margin-top: 40px; color: #444; font-size: 12px; }
        .btn { display: inline-block; background: #ff007a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">FLOWPay</div>
        </div>
        
        <div style="text-align: center;">
            <div class="status-badge">Pagamento Confirmado</div>
            <h1>O Fluxo começou! 🚀</h1>
            <p>Acabamos de confirmar seu pagamento via Pix. Sua liquidação em cripto já está sendo processada de forma autônoma.</p>
        </div>

        <div class="order-details">
            <div class="detail-row">
                <span class="detail-label">ID DO PEDIDO</span>
                <span class="detail-value">${orderId}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">VALOR PAGO</span>
                <span class="detail-value">R$ ${amount.toFixed(2)}</span>
            </div>
            <div class="detail-row" style="border: none;">
                <span class="detail-label">STATUS</span>
                <span class="detail-value">COMPLETED</span>
            </div>
        </div>

        <div style="text-align: center;">
            <p>Você pode acompanhar o status da sua transação diretamente no nosso dashboard.</p>
            <a href="https://flowpay.cash/dashboard" class="btn">Ver meu Dashboard</a>
        </div>

        <div class="footer">
            <p>Este é um e-mail automático gerado por FLOWPay Autonomous Protocol.<br>NΞØ Protocol · No Banks, Just Flow.</p>
        </div>
    </div>
</body>
</html>
`;
