// bundle ESM local, CSP 'self' friendly
// lê config do window.NEO_CONFIG (gerado do neo.json) se existir
import { Web3Auth } from "@web3auth/modal";

type NeoConfig = {
  web3auth?: {
    client_id?: string;
    network?: string; // ex: "sapphire_mainnet"
  };
  crypto?: {
    rpc?: string;     // ex: "https://rpc.ankr.com/eth"
    chainId?: string; // ex: "0x1"
  }
};

const cfg: NeoConfig = (window as any).NEO_CONFIG || {};
const clientId = cfg.web3auth?.client_id || "REPLACE_ME";
const web3AuthNetwork = cfg.web3auth?.network || "sapphire_mainnet";
const chainConfig = {
  chainNamespace: "eip155",
  chainId: cfg.crypto?.chainId || "0x1",
  rpcTarget: cfg.crypto?.rpc || "https://rpc.ankr.com/eth",
};

const web3auth = new Web3Auth({ clientId, web3AuthNetwork, chainConfig });
await web3auth.initModal();

export async function connectWallet() {
  const provider = await web3auth.connect();
  (window as any).__provider = provider;
  return !!provider;
}
export async function disconnectWallet() {
  await web3auth.logout();
  (window as any).__provider = null;
  return true;
}

// expõe funções globais usadas no checkout
(window as any).connectWallet = connectWallet;
(window as any).disconnectWallet = disconnectWallet;
