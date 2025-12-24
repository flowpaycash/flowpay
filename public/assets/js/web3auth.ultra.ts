// Web3Auth Ultra-Minimal - Sem Sentry, sem Analytics, sem React
import { Web3Auth } from "@web3auth/modal";

// Configuração global
declare global {
  interface Window {
    __web3auth?: Web3Auth | null;
    __provider?: any;
    NEO_CONFIG?: any | {   
      web3auth: {
        client_id: string;
        network: string;
      };
      crypto: {
        rpc: string;
        chainId: string;
      };
    };
  }
}

// Configuração ultra-minimal
const uiConfig = {
  logoLight: "https://flowpaypix.netlify.app/assets/logos/flowpay-logo.png",
  logoDark: "https://flowpaypix.netlify.app/assets/logos/flowpay-logo.png",
  loginMethodsOrder: ["google"],
  displayErrorsOnModal: false,
  addPreviousLoginHint: false,
  displayInstalledExternalWallets: false,
  displayExternalWalletsCount: false,
  mode: "light" as const,
  loginGridCol: 2,
  primaryButton: "socialLogin" as const,
  defaultLanguage: "pt",
  modalZIndex: "99998",
  widgetType: "modal" as const,
  hideWalletDiscovery: true,
  signInMethods: ["social"],
  buttonRadius: "pill" as const,
  logoAlignment: "center" as const
};

// Configuração do modal ultra-minimal
const modalConfig = {
  hideWalletDiscovery: true,
  connectors: {
    auth: {
      label: "Autenticação",
      loginMethods: {
        google: {}
      }
    }
  }
};

// Instância Web3Auth
const web3auth = new Web3Auth({
  clientId: window.NEO_CONFIG?.web3auth?.client_id || "REPLACE_ME",
  web3AuthNetwork: window.NEO_CONFIG?.web3auth?.network || "sapphire_mainnet",
  uiConfig: uiConfig as any,
  modalConfig
});

// Flag de inicialização
let isInitialized = false;

// Função de inicialização
async function initWeb3Auth() {
  if (isInitialized) return;
  
  try {
    await web3auth.init();
    window.__web3auth = web3auth;
    isInitialized = true;
    console.log("✅ Web3Auth ultra-minimal inicializado");
  } catch (error) {
    console.error("❌ Web3Auth falhou:", error);
    window.__web3auth = null;
  }
}

// Função de conexão
async function connectWallet() {
  if (!isInitialized) {
    await initWeb3Auth();
  }
  
  if (!window.__web3auth) {
    return false;
  }
  
  try {
    const provider = await window.__web3auth.connect();
    window.__provider = provider;
    return !!provider;
  } catch (error) {
    console.error("❌ Falha ao conectar:", error);
    return false;
  }
}

// Função de desconexão
async function disconnectWallet() {
  if (window.__web3auth) {
    try {
      await window.__web3auth.logout();
      window.__provider = null;
      console.log("✅ Desconectado");
    } catch (error) {
      console.error("❌ Falha ao desconectar:", error);
    }
  }
}

// Inicialização automática
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWeb3Auth);
} else {
  initWeb3Auth();
}

// Exportar funções globais
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;

export { connectWallet, disconnectWallet };
