import { createPublicClient, custom } from 'viem';
import { polygon } from 'viem/chains';
import { toMetaMaskSmartAccount, Implementation, createInfuraBundlerClient } from '@metamask/smart-accounts-kit';

declare global {
    interface Window {
        NEO_CONFIG?: any;
        connectWallet?: () => Promise<boolean>;
        disconnectWallet?: () => Promise<void>;
        ethereum?: any;
        __smartAccount?: any;
        __bundlerClient?: any;
        __provider?: any;
    }
}

export async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('Por favor, instale a MetaMask para usar Account Abstraction!');
        window.open('https://metamask.io/', '_blank');
        return false;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        const publicClient = createPublicClient({
            chain: polygon,
            transport: custom(window.ethereum)
        });

        console.log("🚀 Inicializando MetaMask Smart Account (AA)...");

        const config = window.NEO_CONFIG || {};
        const infuraApiKey = config.infura?.apiKey || '';

        // Criar Smart Account (Account Abstraction)
        const smartAccount = await toMetaMaskSmartAccount({
            client: publicClient,
            implementation: Implementation.Hybrid,
            address,
            signer: {
                address,
                async signMessage({ message }: { message: any }) {
                    return window.ethereum.request({
                        method: 'personal_sign',
                        params: [typeof message === 'string' ? message : (message.raw || message), address],
                    });
                },
                async signTypedData(typedData: any) {
                    return window.ethereum.request({
                        method: 'eth_signTypedData_v4',
                        params: [address, JSON.stringify(typedData)],
                    });
                }
            } as any
        });

        let bundlerClient;
        if (infuraApiKey) {
            try {
                bundlerClient = createInfuraBundlerClient({
                    chain: polygon,
                    apiKey: infuraApiKey,
                } as any);
                console.log("⛽ Bundler Infura ativo");
            } catch (err) {
                console.warn("⚠️ Falha ao carregar Bundler Infura:", err);
            }
        }

        window.__smartAccount = smartAccount;
        window.__bundlerClient = bundlerClient;
        window.__provider = window.ethereum;

        console.log("✅ Smart Account conectada:", smartAccount.address);

        // Helper para o App enviar transações via AA
        (window as any).sendSATransaction = async (params: any) => {
            if (window.__bundlerClient) {
                return await (smartAccount as any).sendUserOperation({
                    calls: [params],
                    bundlerClient: window.__bundlerClient
                });
            }
            return await (smartAccount as any).sendTransaction(params);
        };

        localStorage.setItem('flowpay_wallet_type', 'metamask_aa');
        localStorage.setItem('flowpay_smart_address', smartAccount.address);

        return true;
    } catch (e: any) {
        console.error("❌ Falha ao conectar MetaMask AA:", e);
        return false;
    }
}

export async function disconnectWallet() {
    window.__smartAccount = null;
    window.__provider = null;
    localStorage.removeItem('flowpay_wallet_type');
    localStorage.removeItem('flowpay_smart_address');
    console.log("✅ Smart Wallet desconectada");
}

// Expor globalmente para o Astro/Login
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
