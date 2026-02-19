// Web3Auth SMART - carregamento inteligente e sob demanda
import { Web3Auth } from "@web3auth/modal";

declare global {
  interface Window {
    NEO_CONFIG?: any;
    connectWallet?: () => Promise<boolean>;
    disconnectWallet?: () => Promise<void>;
    __web3auth?: Web3Auth | null;
    __provider?: any;
  }
}

const cfg = (window.NEO_CONFIG ?? {}) as {
  web3auth?: { client_id?: string; network?: string };
  crypto?: { rpc?: string; chainId?: string };
};

const clientId = cfg.web3auth?.client_id || "REPLACE_ME";
const web3AuthNetwork = (cfg.web3auth?.network || "sapphire_mainnet") as any;

// Configuração inteligente - apenas o essencial
const web3auth = new Web3Auth({ 
  clientId, 
  web3AuthNetwork,
  // Configuração minimalista
  uiConfig: {
    logoLight: "https://flowpaypix.netlify.app/assets/logos/flowpay-logo.png",
    logoDark: "https://flowpaypix.netlify.app/assets/logos/flowpay-logo.png",
    // Apenas métodos essenciais
    loginMethodsOrder: ["google"],
    // Desabilitar recursos pesados
    displayErrorsOnModal: false,
    addPreviousLoginHint: false,
    displayInstalledExternalWallets: false,
    displayExternalWalletsCount: false,
    // Modo simples
    mode: "light",
    loginGridCol: 2,
    primaryButton: "socialLogin"
  },
  // Configurações para redução de bundle
  modalConfig: {
    hideWalletDiscovery: true,
    connectors: {
      auth: {
        label: "Login",
        loginMethods: {
          google: {}
        }
      }
    }
  }
});

// Inicialização lazy e inteligente
let isInitialized = false;
async function boot() {
  if (isInitialized) return;
  
  try {
    await web3auth.init();
    window.__web3auth = web3auth;
    isInitialized = true;
    console.log("✅ Web3Auth smart inicializado");
  } catch (e) {
    console.error("❌ Web3Auth falhou:", e);
    window.__web3auth = null;
  }
}

// Inicializar apenas quando necessário
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Funções inteligentes
export async function connectWallet() {
  if (!isInitialized) {
    await boot();
  }
  
  if (!window.__web3auth) return false;
  
  try {
    const provider = await window.__web3auth.connect();
    window.__provider = provider;
    return !!provider;
  } catch (e) {
    console.error("❌ Falha ao conectar:", e);
    return false;
  }
}

export async function disconnectWallet() {
  if (!window.__web3auth) return;
  
  try {
    await window.__web3auth.logout();
    window.__provider = null;
    console.log("✅ Desconectado");
  } catch (e) {
    console.error("❌ Falha ao desconectar:", e);
  }
}

// Expor globalmente
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
