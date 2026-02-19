// Wallet Boot Loader NΞØ v2 - Hover Prefetch + Fallback + UX
declare global {
  interface Window {
    NEO_CONFIG?: any;
    ethereum?: any;
    connectWallet?: () => Promise<boolean>;
    disconnectWallet?: () => Promise<void>;
  }
}

let loaded: Promise<{ mode: "web3auth" | "injected" }> | null = null;

async function loadWeb3AuthChunk() {
  return import("./web3auth.inner.js").then((m) => {
    window.connectWallet = m.connectWeb3Auth;
    window.disconnectWallet = m.disconnectWeb3Auth;
    return { mode: "web3auth" as const };
  });
}

function enableInjectedFallback() {
  window.connectWallet = async () => {
    if (!window.ethereum) { 
      alert("Instale uma carteira (ex.: MetaMask)"); 
      return false; 
    }
    await window.ethereum.request?.({ method: "eth_requestAccounts" });
    return true;
  };
  window.disconnectWallet = async () => {
    // Limpar provider global
    (window as any).__provider = null;
    console.log("✅ Desconectado");
  };
  return { mode: "injected" as const };
}

async function ensureLoaded(kind: "click" | "hover" = "click") {
  if (loaded) return loaded;

  const enabled = !!(window.NEO_CONFIG?.web3auth?.enabled);
  if (!enabled) return (loaded = Promise.resolve(enableInjectedFallback()));

  // Data Saver? Não faça prefetch no hover
  const saveData = (navigator as any)?.connection?.saveData === true;
  if (kind === "hover" && saveData) return (loaded = Promise.resolve({ mode: "web3auth" }));

  // Timeout de 4s: se chunk não vier, cai para injected
  loaded = Promise.race([
    loadWeb3AuthChunk(),
    new Promise<{ mode: "injected" }>((resolve) =>
      setTimeout(() => resolve(enableInjectedFallback()), 4000)
    ),
  ]);
  return loaded;
}

// Funções globais com lazy loading
async function connectWallet(): Promise<boolean> {
  await ensureLoaded("click");
  return window.connectWallet!();
}

async function disconnectWallet(): Promise<void> {
  await ensureLoaded("click");
  return window.disconnectWallet!();
}

// Wire global
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;

// 🎯 Prefetch no hover do botão
document.addEventListener("mouseenter", (e) => {
  const el = (e.target as HTMLElement)?.closest?.('[data-action="connect-wallet"],#connect-wallet-btn');
  if (!el) return;
  void ensureLoaded("hover");
}, { capture: true, passive: true });

// UX: Spinner no botão ao clicar
document.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement)?.closest?.('[data-action="connect-wallet"],#connect-wallet-btn') as HTMLButtonElement;
  if (!btn) return;
  btn.classList.add("is-loading");
  // Tira o loading em 6s se nada acontecer (proteção)
  setTimeout(() => btn.classList.remove("is-loading"), 6000);
}, { capture: true });

// Log de inicialização
console.log("🚀 Wallet Boot NΞØ v2 carregado", {
  web3auth: window.NEO_CONFIG?.web3auth?.enabled ? "enabled" : "disabled",
  fallback: "MetaMask",
  features: ["hover-prefetch", "timeout-fallback", "ux-spinner"]
});

export { connectWallet, disconnectWallet };
