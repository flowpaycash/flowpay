/**
 * Template base para todos os e-mails do FlowPay.
 *
 * @param {object} options
 * @param {string}  options.title       - Título principal (h1)
 * @param {string}  options.body        - HTML do conteúdo central (parágrafos, tabelas, etc.)
 * @param {object}  [options.cta]       - Call-to-action opcional
 * @param {string}   options.cta.label  - Texto do botão
 * @param {string}   options.cta.url    - URL do botão
 * @param {string}  [options.badge]     - Texto do badge colorido acima do título (ex: "Novo cadastro")
 * @param {string}  [options.badgeColor] - Cor do badge: 'green' | 'orange' | 'red' | 'blue' (default: 'orange')
 * @param {string}  [options.footer]    - Texto extra no footer (opcional)
 * @returns {string} HTML completo do e-mail
 */
export function emailTemplate({ title, body, cta, badge, badgeColor = 'orange', footer }) {
    const LOGO_URL = 'https://flowpay.cash/img/logos/flowpay-header-logo.png';
    const SITE_URL = 'https://flowpay.cash';

    const badgePalette = {
        green:  { bg: 'rgba(0,200,100,0.12)',  border: 'rgba(0,200,100,0.3)',  color: '#00c864' },
        orange: { bg: 'rgba(255,122,0,0.12)',  border: 'rgba(255,122,0,0.3)',  color: '#ff4da6' },
        red:    { bg: 'rgba(255,50,50,0.12)',  border: 'rgba(255,50,50,0.3)',  color: '#ff3232' },
        blue:   { bg: 'rgba(0,180,255,0.12)',  border: 'rgba(0,180,255,0.3)',  color: '#00b4ff' },
    };
    const palette = badgePalette[badgeColor] ?? badgePalette.orange;

    const badgeHtml = badge ? `
        <div style="display:inline-block;background:${palette.bg};border:1px solid ${palette.border};color:${palette.color};padding:5px 14px;border-radius:20px;font-size:0.78rem;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:16px">
            ${badge}
        </div>` : '';

    const ctaHtml = cta ? `
        <div style="margin-top:36px;text-align:center">
            <a href="${cta.url}"
               style="display:inline-block;background:linear-gradient(135deg,#ff007a,#ff4da6);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:0.95rem;letter-spacing:0.3px">
                ${cta.label}
            </a>
        </div>` : '';

    const footerText = footer ?? 'Este é um e-mail automático. Por favor, não responda a esta mensagem.';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

                    <!-- Header / Logo -->
                    <tr>
                        <td align="center" style="padding-bottom:32px">
                            <a href="${SITE_URL}" style="text-decoration:none">
                                <img src="${LOGO_URL}" alt="FlowPay" height="36"
                                     style="height:36px;display:block" />
                            </a>
                        </td>
                    </tr>

                    <!-- Card principal -->
                    <tr>
                        <td style="background:#111111;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:40px 36px">

                            ${badgeHtml}

                            <h1 style="margin:0 0 16px;font-size:1.4rem;font-weight:700;color:#ffffff;line-height:1.3">
                                ${title}
                            </h1>

                            <div style="color:rgba(255,255,255,0.65);font-size:0.9rem;line-height:1.7">
                                ${body}
                            </div>

                            ${ctaHtml}

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top:28px">
                            <p style="margin:0;color:rgba(255,255,255,0.2);font-size:0.75rem;line-height:1.6">
                                ${footerText}<br />
                                <a href="${SITE_URL}" style="color:rgba(255,255,255,0.3);text-decoration:none">flowpay.cash</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}
