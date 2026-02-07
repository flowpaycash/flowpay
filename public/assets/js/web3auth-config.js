// FLOWPay - Web3Auth Configuration
// Configuração local para bundle

export const WEB3AUTH_CONFIG = {
  clientId: process.env.WEB3AUTH_CLIENT_ID || "WEB3AUTH_CLIENT_ID",
  web3AuthNetwork: "sapphire_mainnet",
  uiConfig: {
    logoLight: "https://flowpay.cash/img/flowpay-logo.png",
    logoDark: "https://flowpay.cash/img/flowpay-logo.png",
    loginMethodsOrder: ["google", "facebook", "twitter", "reddit", "discord", "twitch", "apple", "line", "github", "kakao", "linkedin", "weibo", "wechat", "email_password"]
  }
};
