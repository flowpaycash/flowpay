import { emailTemplate } from './base.mjs';

/**
 * Email de confirmação de cadastro para o usuário.
 * @param {object} params
 * @param {string} params.name - Nome do usuário
 * @returns {string} HTML formatado
 */
export const registroTemplate = ({ name }) => emailTemplate({
    badge: 'Cadastro recebido',
    badgeColor: 'blue',
    title: `Olá, ${name}!`,
    body: `
        <p style="margin:0 0 16px">
            Recebemos seu pedido de cadastro no FlowPay. Nossa equipe irá analisar suas informações
            e você será notificado por e-mail assim que sua conta for aprovada.
        </p>
        <p style="margin:0;color:rgba(255,255,255,0.35);font-size:0.85rem">
            Prazo de análise: até 24 horas úteis.
        </p>
    `,
});
