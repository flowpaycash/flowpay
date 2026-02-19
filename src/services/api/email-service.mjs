import { secureLog } from './config.mjs';

/**
 * Envia um e-mail usando a API do Resend.
 * @param {object} options - Opções do e-mail
 * @param {string} options.to - Destinatário
 * @param {string} options.subject - Assunto
 * @param {string} options.html - Conteúdo HTML do e-mail
 * @param {string} [options.from] - Remetente (opcional, usa default)
 */
export async function sendEmail({ to, subject, html, from }) {
    const apiKey = process.env.RESEND_API_KEY;
    const defaultFrom = process.env.SMTP_FROM || 'FlowPay <noreply@flowpay.cash>';

    if (!apiKey) {
        secureLog('warn', 'Tentativa de envio de e-mail sem RESEND_API_KEY configurada.');
        return { success: false, error: 'API Key missing' };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                from: from || defaultFrom,
                to: Array.isArray(to) ? to : [to],
                subject,
                html
            })
        });

        const data = await response.json();

        if (response.ok) {
            secureLog('info', 'E-mail enviado via Resend com sucesso', { to, subject, id: data.id });
            return { success: true, id: data.id };
        } else {
            secureLog('error', 'Falha ao enviar e-mail via Resend', { error: data, to });
            return { success: false, error: data };
        }
    } catch (error) {
        secureLog('error', 'Erro crítico no serviço de e-mail Resend', { error: error.message });
        return { success: false, error: error.message };
    }
}
