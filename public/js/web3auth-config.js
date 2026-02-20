// 🚀 FLOWPay - Web3Auth Configuration
// Configuração para integração com MetaMask Developer

const WEB3AUTH_CONFIG = {
    // 🔑 MetaMask Developer Credentials
    clientId: '9afb8749df8f4370aded1dce851d13f4',
    
    // 🌐 Network Configuration
    chainConfig: {
        chainNamespace: "eip155",
        chainId: "0x1", // Ethereum Mainnet
        rpcTarget: "https://rpc.ankr.com/eth",
        displayName: "Ethereum Mainnet",
        blockExplorer: "https://etherscan.io",
        ticker: "ETH",
        tickerName: "Ethereum"
    },
    
    // 🎭 Web3Auth Settings
    web3AuthNetwork: "mainnet",
    enableLogging: false,
    
    // 🔐 Authentication Methods
    authMode: "DAPP",
    
    // 📱 UI Configuration
    theme: "dark",
    appName: "FLOWPay",
    appUrl: "https://flowpay.cash",
    
    // 🚀 Advanced Features
    enableMFA: true,
    enableOneKey: true,
    
    // 📊 Analytics
    enableAnalytics: true
};

// 🌟 Web3Auth Instance
let web3auth = null;
let provider = null;

// 🔧 Initialize Web3Auth
async function initializeWeb3Auth() {
    try {
        // Initializing Web3Auth
        
        // Import Web3Auth using import map
        const { Web3Auth } = await import('@web3auth/modal');
        
        // Create Web3Auth instance with simplified config
        web3auth = new Web3Auth({
            clientId: WEB3AUTH_CONFIG.clientId,
            web3AuthNetwork: WEB3AUTH_CONFIG.web3AuthNetwork,
            chainConfig: WEB3AUTH_CONFIG.chainConfig
        });
        
        // Initialize
        await web3auth.initModal();
        
        // Web3Auth initialized
        return true;
        
    } catch (error) {
        // Web3Auth init failed
        return false;
    }
}

// 🔗 Connect Wallet
async function connectWallet() {
    try {
        if (!web3auth) {
            throw new Error("Web3Auth not initialized");
        }
        
        // Connecting wallet
        
        // Connect to Web3Auth
        provider = await web3auth.connect();
        
        if (provider) {
            // Wallet connected
            
            // Get user info
            const user = await web3auth.getUserInfo();
            // User info retrieved
            
            // Update UI
            updateWalletStatus(true, user);
            
            return true;
        }
        
    } catch (error) {
        // Wallet connection failed
        updateWalletStatus(false, null);
        return false;
    }
}

// 🔌 Disconnect Wallet
async function disconnectWallet() {
    try {
        if (web3auth) {
            await web3auth.logout();
            provider = null;
            // Wallet disconnected
            updateWalletStatus(false, null);
        }
    } catch (error) {
        // Wallet disconnection failed
    }
}

// 📊 Update Wallet Status in UI
function updateWalletStatus(connected, userInfo) {
    const walletStatus = document.getElementById('wallet-status');
    const walletAddress = document.getElementById('wallet-address');
    const connectBtn = document.getElementById('connect-wallet-btn');
    const disconnectBtn = document.getElementById('disconnect-wallet-btn');
    
    if (connected && userInfo) {
        // Wallet connected
        walletStatus.textContent = '🟢 Conectado';
        walletStatus.className = 'text-green-500 font-semibold';
        
        // Show wallet address (shortened)
        const address = userInfo.walletAddress || 'Endereço não disponível';
        walletAddress.textContent = address.length > 20 ? 
            `${address.substring(0, 10)}...${address.substring(address.length - 8)}` : 
            address;
        
        // Update buttons
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'inline-block';
        
        // Enable crypto mode
        enableCryptoMode();
        
    } else {
        // Wallet disconnected
        walletStatus.textContent = '🔴 Desconectado';
        walletStatus.className = 'text-red-500 font-semibold';
        walletAddress.textContent = 'Nenhuma carteira conectada';
        
        // Update buttons
        connectBtn.style.display = 'inline-block';
        disconnectBtn.style.display = 'none';
        
        // Disable crypto mode
        disableCryptoMode();
    }
}

// 🎭 Enable Crypto Mode
function enableCryptoMode() {
    const cryptoForm = document.getElementById('crypto-form');
    const cryptoSubmitBtn = document.getElementById('crypto-submit-btn');
    
    if (cryptoForm && cryptoSubmitBtn) {
        cryptoForm.style.opacity = '1';
        cryptoForm.style.pointerEvents = 'auto';
        cryptoSubmitBtn.disabled = false;
        cryptoSubmitBtn.textContent = '🚀 Processar Transação Cripto';
    }
}

// 🚫 Disable Crypto Mode
function disableCryptoMode() {
    const cryptoForm = document.getElementById('crypto-form');
    const cryptoSubmitBtn = document.getElementById('crypto-submit-btn');
    
    if (cryptoForm && cryptoSubmitBtn) {
        cryptoForm.style.opacity = '0.5';
        cryptoForm.style.pointerEvents = 'none';
        cryptoSubmitBtn.disabled = true;
        cryptoSubmitBtn.textContent = '🔒 Conecte uma Carteira';
    }
}

// 🌟 Process Crypto Transaction
async function processCryptoTransaction(formData) {
    try {
        if (!provider) {
            throw new Error("Carteira não conectada");
        }
        
        // Processing crypto transaction
        
        // Get transaction data
        const amount = formData.get('amount');
        const currency = formData.get('currency');
        
        // Import Web3 dynamically
        const Web3 = (await import('web3')).default;
        const web3 = new Web3(provider);
        
        // Create transaction object
        const transaction = {
            from: await getWalletAddress(),
            to: '0x1111111111111111111111111111111111111111', // FLOWPay contract (mock)
            value: web3.utils.toWei(amount.toString(), 'ether'),
            gas: '21000',
            gasPrice: await getGasPrice()
        };
        
        // Send transaction
        const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [transaction]
        });
        
        // Transaction sent
        
        // Show success
        showTransactionResult({
            success: true,
            hash: txHash,
            amount: amount,
            currency: currency,
            type: 'crypto'
        });
        
        return txHash;
        
    } catch (error) {
        // Crypto transaction failed
        
        showTransactionResult({
            success: false,
            error: error.message,
            type: 'crypto'
        });
        
        return null;
    }
}

// 🔍 Get Wallet Address
async function getWalletAddress() {
    try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        return accounts[0];
    } catch (error) {
        // Failed to get wallet address
        return null;
    }
}

// ⛽ Get Gas Price
async function getGasPrice() {
    try {
        return await provider.request({ method: 'eth_gasPrice' });
    } catch (error) {
        // Failed to get gas price
        return '0x3b9aca00'; // 1 Gwei default
    }
}

// 📱 Show Transaction Result
function showTransactionResult(result) {
    const resultDiv = document.getElementById('transaction-result');
    
    if (resultDiv) {
        if (result.success) {
            resultDiv.innerHTML = `
                <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                    <h3 class="font-bold">✅ Transação Cripto Processada!</h3>
                    <p><strong>Hash:</strong> ${result.hash}</p>
                    <p><strong>Valor:</strong> ${result.amount} ${result.currency}</p>
                    <p><strong>Tipo:</strong> Transação Blockchain</p>
                    <a href="https://etherscan.io/tx/${result.hash}" target="_blank" 
                       class="text-blue-600 hover:text-blue-800 underline">
                        Ver no Etherscan
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <h3 class="font-bold">❌ Erro na Transação</h3>
                    <p><strong>Erro:</strong> ${result.error}</p>
                    <p><strong>Tipo:</strong> Transação Cripto</p>
                </div>
            `;
        }
        
        resultDiv.style.display = 'block';
    }
}

// 🌟 Export functions for global use
// Use setTimeout to ensure DOM is ready
setTimeout(() => {
    window.WEB3AUTH_CONFIG = WEB3AUTH_CONFIG;
    window.initializeWeb3Auth = initializeWeb3Auth;
    window.connectWallet = connectWallet;
    window.disconnectWallet = disconnectWallet;
    window.processCryptoTransaction = processCryptoTransaction;
    window.updateWalletStatus = updateWalletStatus;
}, 100);

// Web3Auth configuration loaded
