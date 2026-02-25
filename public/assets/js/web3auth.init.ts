// bundle ESM local, CSP 'self' friendly - OTIMIZADO
import { Web3Auth } from "@web3auth/modal";

declare global {
  interface Window {
    NEO_CONFIG?: any;
    __web3auth?: any;
    __provider?: any;
    connectWallet?: () => Promise<boolean>;
    disconnectWallet?: () => Promise<void>;
  }
}

const cfg = (window.NEO_CONFIG ?? {}) as {
  web3auth?: { client_id?: string; network?: string };
  crypto?: { rpc?: string; chainId?: string };
};

const clientId = cfg.web3auth?.client_id || "REPLACE_ME";
const web3AuthNetwork = (cfg.web3auth?.network || "sapphire_mainnet") as any;

// Configuração minimalista para reduzir bundle size
const options: any = {
  clientId,
  web3AuthNetwork,
  uiConfig: {
    logoLight: "https://flowpay.cash/assets/logos/flowpay-logo.png",
    logoDark: "https://flowpay.cash/assets/logos/flowpay-logo.png",
    // Apenas métodos essenciais para reduzir dependências
    loginMethodsOrder: ["google", "email_passwordless"],
  }
};

const web3auth = new Web3Auth(options);

async function boot() {
  try {
    await web3auth.init();
    window.__web3auth = web3auth;
    console.log("✅ Web3Auth inicializado com sucesso");
  } catch (e) {
    console.error("❌ Web3Auth init falhou:", e);
    window.__web3auth = null;
  }
}

// Inicialização lazy para reduzir impacto inicial
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export async function connectWallet() {
  if (!window.__web3auth) return false;
  try {
    const provider = await window.__web3auth.connect();
    window.__provider = provider;
    return !!provider;
  } catch (e) {
    console.error("❌ Falha ao conectar carteira:", e);
    return false;
  }
}

export async function disconnectWallet() {
  if (!window.__web3auth) return;
  try {
    await window.__web3auth.logout();
    window.__provider = null;
    console.log("✅ Carteira desconectada");
  } catch (e) {
    console.error("❌ Falha ao desconectar:", e);
  }
}

// Expor globalmente
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
