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
        // 1. Verificar/Trocar para Polygon (ID: 137 ou 0x89)
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0x89') {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x89' }],
                });
            } catch (switchError: any) {
                // Se a rede não existir na MetaMask, adicioná-la
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x89',
                            chainName: 'Polygon Mainnet',
                            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                            rpcUrls: ['https://polygon-rpc.com/'],
                            blockExplorerUrls: ['https://polygonscan.com/']
                        }]
                    });
                } else {
                    throw switchError;
                }
            }
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        const publicClient = createPublicClient({
            chain: polygon,
            transport: custom(window.ethereum)
        });

        console.log("🚀 Inicializando MetaMask Smart Account (AA)...");

        const config = window.NEO_CONFIG || {};
        const bundlerEndpoint = config.infura?.bundlerEndpoint || '';

        // Criar Smart Account (Account Abstraction)
        const smartAccount = await (toMetaMaskSmartAccount as any)({
            client: publicClient,
            implementation: Implementation.Hybrid,
            address,
            signer: {
                address,
                async signMessage({ message }: { message: string | { raw: string | Uint8Array } }) {
                    return window.ethereum.request({
                        method: 'personal_sign',
                        params: [typeof message === 'string' ? message : (message.raw || message), address],
                    });
                },
                async signTypedData(typedData: Record<string, unknown>) {
                    return window.ethereum.request({
                        method: 'eth_signTypedData_v4',
                        params: [address, JSON.stringify(typedData)],
                    });
                }
            }
        });

        let bundlerClient: any = null;
        if (bundlerEndpoint) {
            try {
                bundlerClient = (createInfuraBundlerClient as any)({
                    chain: polygon,
                    // Bundler requests are proxied through server-side endpoint
                    transport: custom({
                        async request({ method, params }: { method: string; params: unknown[] }) {
                            const res = await fetch(bundlerEndpoint, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ method, params }),
                            });
                            const data = await res.json();
                            if (data.error) throw new Error(data.error.message || 'Bundler error');
                            return data.result;
                        }
                    }),
                });
                console.log("⛽ Bundler Infura ativo (proxied)");
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
                try {
                    return await (smartAccount as any).sendUserOperation({
                        calls: [params],
                        bundlerClient: window.__bundlerClient
                    });
                } catch (err) {
                    console.error("❌ Falha no Bundler, tentando fallback para transação direta:", err);
                }
            }
            return await (smartAccount as any).sendTransaction(params);
        };

        localStorage.setItem('flowpay_wallet_type', 'metamask_aa');
        localStorage.setItem('flowpay_smart_address', smartAccount.address);

        return true;
    } catch (e: any) {
        console.error("❌ Falha ao conectar MetaMask AA:", e);
        if (e.code === 4001) {
            console.warn("Usuário recusou a conexão.");
        } else {
            alert(`Erro ao conectar Smart Account: ${e.message || 'Erro desconhecido'}`);
        }
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
