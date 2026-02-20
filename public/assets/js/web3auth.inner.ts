// Web3Auth Inner Chunk - Carregado apenas quando necessário
import { Web3Auth } from "@web3auth/modal";

// Configuração do Web3Auth
const uiConfig = {
  logoLight: "https://flowpay.cash/assets/logos/flowpay-logo.png",
  logoDark: "https://flowpay.cash/assets/logos/flowpay-logo.png",
  loginMethodsOrder: ["google"],
  displayErrorsOnModal: false,
  addPreviousLoginHint: false,
  displayInstalledExternalWallets: false,
  displayExternalWalletsCount: false,
  mode: "light" as const,
  loginGridCol: 2 as const,
  primaryButton: "socialLogin" as const,
  defaultLanguage: "pt" as const,
  modalZIndex: "99998",
  widgetType: "modal" as const,
  hideWalletDiscovery: true,
  signInMethods: ["social"] as const,
  buttonRadius: "pill" as const,
  logoAlignment: "center" as const
};

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
let web3auth: Web3Auth | null = null;
let isInitialized = false;

// Função de inicialização
async function initWeb3Auth() {
  if (isInitialized) return;
  
  try {
    const config = (window as any).NEO_CONFIG;
    if (!config?.web3auth?.client_id || config.web3auth.client_id === "REPLACE_ME") {
      throw new Error("Web3Auth client_id não configurado");
    }

    web3auth = new Web3Auth({
      clientId: config.web3auth.client_id,
      web3AuthNetwork: config.web3auth.network || "sapphire_mainnet",
      uiConfig: uiConfig as any,
      modalConfig: modalConfig as any
    });

    await web3auth.init();
    (window as any).__web3auth = web3auth;
    isInitialized = true;
    console.log("✅ Web3Auth inner inicializado");
  } catch (error) {
    console.error("❌ Web3Auth inner falhou:", error);
    throw error;
  }
}

// Função de conexão
export async function connectWeb3Auth(): Promise<boolean> {
  if (!isInitialized) {
    await initWeb3Auth();
  }
  
  if (!web3auth) {
    return false;
  }
  
  try {
    const provider = await web3auth.connect();
    (window as any).__provider = provider;
    console.log("✅ Conectado via Web3Auth");
    return !!provider;
  } catch (error) {
    console.error("❌ Falha ao conectar Web3Auth:", error);
    return false;
  }
}

// Função de desconexão
export async function disconnectWeb3Auth(): Promise<void> {
  if (web3auth) {
    try {
      await web3auth.logout();
      (window as any).__provider = null;
      console.log("✅ Desconectado do Web3Auth");
    } catch (error) {
      console.error("❌ Falha ao desconectar Web3Auth:", error);
    }
  }
}
