// FLOWPay - Admin Panel JavaScript
// Painel administrativo para gerenciar transações Pix

// Configurações
// Senha será obtida via API para maior segurança
const ADMIN_PASSWORD_ENDPOINT = '/.netlify/functions/get-admin-config';
const SESSION_KEY = 'flowpay_admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 horas

// Elementos DOM
let loginScreen, adminPanel, transactionsTable, transactionsTbody;
let statusFilter, moedaFilter, refreshBtn, downloadBtn, logoutBtn;

// Estado da aplicação
let transactions = [];
let settlementOrders = []; // Ordens de liquidação pendentes
let isAuthenticated = false;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('FLOWPay Admin loaded');

    initializeElements();
    checkAuthentication();
    setupEventListeners();
    
    if (isAuthenticated) {
        showAdminPanel();
        loadTransactions();
        loadSettlementOrders();
        startAutoRefresh();
        // Auto-refresh também para ordens de liquidação
        setInterval(loadSettlementOrders, 30000); // A cada 30 segundos
    }
});

// Inicializar elementos DOM
function initializeElements() {
    loginScreen = document.getElementById('login-screen');
    adminPanel = document.getElementById('admin-panel');
    transactionsTable = document.getElementById('transactions-table');
    transactionsTbody = document.getElementById('transactions-tbody');
    statusFilter = document.getElementById('status-filter');
    moedaFilter = document.getElementById('moeda-filter');
    refreshBtn = document.getElementById('refresh-btn');
    downloadBtn = document.getElementById('download-btn');
    logoutBtn = document.getElementById('logout-btn');
}

// Configurar event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Admin actions
    refreshBtn.addEventListener('click', loadTransactions);
    downloadBtn.addEventListener('click', downloadTransactions);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Filters
    statusFilter.addEventListener('change', filterTransactions);
    moedaFilter.addEventListener('change', filterTransactions);
}

// Verificar autenticação
function checkAuthentication() {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
        const sessionData = JSON.parse(session);
        if (Date.now() - sessionData.timestamp < SESSION_DURATION) {
            isAuthenticated = true;
        } else {
            localStorage.removeItem(SESSION_KEY);
        }
    }
}

// Manipular login
function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;
    
    if (password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        const sessionData = {
            timestamp: Date.now(),
            user: 'admin'
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        
        showAdminPanel();
        loadTransactions();
        startAutoRefresh();
        
        showNotification('✅ Login realizado com sucesso!', 'success');
    } else {
        showNotification('❌ Senha incorreta!', 'error');
    }
}

// Mostrar painel admin
function showAdminPanel() {
    loginScreen.style.display = 'none';
    adminPanel.style.display = 'block';
}

// Carregar transações
async function loadTransactions() {
    try {
        showLoading(true);
        
        // Usar o novo endpoint da Netlify Function
        const response = await fetch('/.netlify/functions/pix-orders');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        transactions = Array.isArray(data) ? data : [];
        
        updateStatistics();
        renderTransactions();
        updateFilters();
        
        showNotification(`✅ ${transactions.length} transações carregadas`, 'success');
        
    } catch (error) {
        console.error('Erro ao carregar transações:', error);
        
        // Se não conseguir carregar, usar dados mock para demonstração
        if (transactions.length === 0) {
            transactions = generateMockData();
            updateStatistics();
            renderTransactions();
            updateFilters();
            showNotification('⚠️ Usando dados de demonstração', 'warning');
        } else {
            showNotification('❌ Erro ao carregar transações', 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Carregar ordens de liquidação pendentes
async function loadSettlementOrders() {
    try {
        const response = await fetch('/.netlify/functions/settlement-orders');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        settlementOrders = data.success ? (data.orders || []) : [];
        
        renderSettlementOrders();
        
    } catch (error) {
        console.error('Erro ao carregar ordens de liquidação:', error);
        settlementOrders = [];
    }
}

// Renderizar ordens de liquidação pendentes
// Escape HTML to prevent XSS when rendering server data
function esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function renderSettlementOrders() {
    const container = document.getElementById('settlement-orders-container');
    if (!container) return;

    if (settlementOrders.length === 0) {
        container.innerHTML = '<p class="no-orders">Nenhuma ordem de liquidação pendente</p>';
        return;
    }

    container.innerHTML = settlementOrders.map(order => {
        const safeOrderId = esc(order.orderId);
        const safeCorrelationId = esc(order.correlationId);
        const safeWallet = order.walletAddress ? esc(order.walletAddress.slice(0, 6) + '...' + order.walletAddress.slice(-4)) : 'N/A';
        const safeNetwork = esc(order.network || 'ethereum');
        const amountBRL = Number(order.amountBRL || 0).toFixed(2);
        const estimatedAmount = Number(order.estimatedAmount || 0).toFixed(6);
        const estimatedRate = Number(order.estimatedRate || 0).toFixed(4);
        const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR') : 'N/A';

        return `
        <div class="settlement-order-card">
            <div class="order-header">
                <span class="order-id">${safeOrderId}</span>
                <span class="order-status pending">Pendente</span>
            </div>
            <div class="order-details">
                <div class="detail-row">
                    <span class="label">PIX ID:</span>
                    <span class="value">${safeCorrelationId}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Valor BRL:</span>
                    <span class="value">R$ ${amountBRL}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Estimado USDT:</span>
                    <span class="value">${estimatedAmount} USDT</span>
                </div>
                <div class="detail-row">
                    <span class="label">Taxa:</span>
                    <span class="value">${estimatedRate}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Wallet:</span>
                    <span class="value code">${safeWallet}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Rede:</span>
                    <span class="value">${safeNetwork}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Criado em:</span>
                    <span class="value">${createdAt}</span>
                </div>
            </div>
            <div class="order-actions">
                <button class="btn-settle" data-order-id="${safeOrderId}" data-wallet="${esc(order.walletAddress)}" data-network="${safeNetwork}">
                    Liquidar Agora
                </button>
            </div>
        </div>`;
    }).join('');

    // Attach event listeners instead of inline onclick (safer)
    container.querySelectorAll('.btn-settle').forEach(btn => {
        btn.addEventListener('click', () => {
            executeSettlement(btn.dataset.orderId, btn.dataset.wallet, btn.dataset.network);
        });
    });
}

// Executar liquidação
async function executeSettlement(orderId, walletAddress, network) {
    if (!confirm(`Confirmar liquidação da ordem ${orderId}?\n\nWallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\nRede: ${network}`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch('/.netlify/functions/settlement-orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId,
                walletAddress,
                network
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ Liquidação executada com sucesso!', 'success');
            loadSettlementOrders(); // Recarregar lista
            loadTransactions(); // Recarregar transações
        } else {
            showNotification(`❌ Erro: ${data.error}`, 'error');
        }
        
    } catch (error) {
        console.error('Erro ao executar liquidação:', error);
        showNotification('❌ Erro ao executar liquidação', 'error');
    } finally {
        showLoading(false);
    }
}

// Expor função globalmente
window.executeSettlement = executeSettlement;

// Gerar dados mock para demonstração
function generateMockData() {
    return [
        {
            id: 'tx_demo_001',
            status: 'PENDING',
            moeda: 'BRL',
            valor: '150.00',
            wallet: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'tx_demo_002',
            status: 'PAID',
            moeda: 'BRL',
            valor: '75.50',
            wallet: '0x8ba1f109551bA432bdf5c3c92dE6832acd2250c87',
            createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'tx_demo_003',
            status: 'CRYPTO_PROCESSED',
            moeda: 'BRL',
            valor: '200.00',
            wallet: '0x1234567890abcdef1234567890abcdef12345678',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        }
    ];
}

// Atualizar estatísticas
function updateStatistics() {
    const total = transactions.length;
    const pending = transactions.filter(t => t.status === 'PENDING').length;
    const paid = transactions.filter(t => t.status === 'PAID').length;
    const processed = transactions.filter(t => t.status === 'CRYPTO_PROCESSED').length;
    
    const totalValue = transactions.reduce((sum, t) => sum + parseFloat(t.valor || 0), 0);
    
    // Atualizar cards de estatísticas
    document.getElementById('total-transactions').textContent = total;
    document.getElementById('pending-transactions').textContent = pending;
    document.getElementById('paid-transactions').textContent = paid;
    document.getElementById('processed-transactions').textContent = processed;
    document.getElementById('total-value').textContent = `R$ ${totalValue.toFixed(2)}`;
}

// Renderizar transações
function renderTransactions() {
    if (!transactionsTbody) return;
    
    transactionsTbody.innerHTML = '';
    
    if (transactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7" class="no-data">Nenhuma transação encontrada</td>';
        transactionsTbody.appendChild(row);
        return;
    }
    
    transactions.forEach(transaction => {
        const row = createTransactionRow(transaction);
        transactionsTbody.appendChild(row);
    });
}

// Criar linha da tabela (XSS-safe)
function createTransactionRow(transaction) {
    const row = document.createElement('tr');
    const safeId = esc(transaction.id);
    const safeWallet = transaction.wallet ? esc(transaction.wallet.slice(0, 6) + '...' + transaction.wallet.slice(-4)) : 'N/A';
    const safeValor = esc(transaction.valor);
    const safeMoeda = esc(transaction.moeda);
    const createdAt = transaction.createdAt ? new Date(transaction.createdAt).toLocaleString('pt-BR') : 'N/A';

    row.innerHTML = `
        <td><code>${safeId}</code></td>
        <td>${getStatusBadge(transaction.status)}</td>
        <td>${safeMoeda}</td>
        <td>R$ ${safeValor}</td>
        <td><code>${safeWallet}</code></td>
        <td>${createdAt}</td>
        <td>
            <button class="action-btn view-btn" data-tx-id="${safeId}">
                <i class="fas fa-eye"></i>
            </button>
        </td>
    `;
    row.querySelector('.view-btn').addEventListener('click', () => viewTransaction(transaction.id));
    return row;
}

// Obter badge de status
function getStatusBadge(status) {
    const badges = {
        'PENDING': '<span class="status-badge pending">Pendente</span>',
        'PAID': '<span class="status-badge paid">Pago</span>',
        'CRYPTO_PROCESSED': '<span class="status-badge processed">Processado</span>'
    };
    return badges[status] || `<span class="status-badge unknown">${status}</span>`;
}

// Atualizar filtros
function updateFilters() {
    const statuses = [...new Set(transactions.map(t => t.status))];
    const moedas = [...new Set(transactions.map(t => t.moeda))];
    
    // Status filter
    statusFilter.innerHTML = '<option value="">Todos os Status</option>';
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = getStatusText(status);
        statusFilter.appendChild(option);
    });
    
    // Moeda filter
    moedaFilter.innerHTML = '<option value="">Todas as Moedas</option>';
    moedas.forEach(moeda => {
        const option = document.createElement('option');
        option.value = moeda;
        option.textContent = moeda;
        moedaFilter.appendChild(option);
    });
}

// Obter texto do status
function getStatusText(status) {
    const texts = {
        'PENDING': 'Pendente',
        'PAID': 'Pago',
        'CRYPTO_PROCESSED': 'Processado'
    };
    return texts[status] || status;
}

// Filtrar transações
function filterTransactions() {
    const statusValue = statusFilter.value;
    const moedaValue = moedaFilter.value;
    
    const filtered = transactions.filter(transaction => {
        const statusMatch = !statusValue || transaction.status === statusValue;
        const moedaMatch = !moedaValue || transaction.moeda === moedaValue;
        return statusMatch && moedaMatch;
    });
    
    renderFilteredTransactions(filtered);
}

// Renderizar transações filtradas
function renderFilteredTransactions(filteredTransactions) {
    if (!transactionsTbody) return;
    
    transactionsTbody.innerHTML = '';
    
    if (filteredTransactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7" class="no-data">Nenhuma transação encontrada com os filtros aplicados</td>';
        transactionsTbody.appendChild(row);
        return;
    }
    
    filteredTransactions.forEach(transaction => {
        const row = createTransactionRow(transaction);
        transactionsTbody.appendChild(row);
    });
}

// Download das transações
async function downloadTransactions() {
    try {
        const response = await fetch('/.netlify/functions/pix-orders');
        const data = await response.json();
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `flowpay_transactions_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('✅ Download realizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro no download:', error);
        showNotification('❌ Erro ao fazer download', 'error');
    }
}

// Visualizar transação
function viewTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
        const details = `
ID: ${transaction.id}
Status: ${transaction.status}
Moeda: ${transaction.moeda}
Valor: R$ ${transaction.valor}
Wallet: ${transaction.wallet}
Criado: ${new Date(transaction.createdAt).toLocaleString('pt-BR')}
Atualizado: ${new Date(transaction.updatedAt).toLocaleString('pt-BR')}
        `;
        alert(details);
    }
}

// Manipular logout
function handleLogout() {
    isAuthenticated = false;
    localStorage.removeItem(SESSION_KEY);
    
    adminPanel.style.display = 'none';
    loginScreen.style.display = 'flex';
    
    showNotification('👋 Logout realizado com sucesso!', 'info');
}

// Mostrar loading
function showLoading(show) {
    if (refreshBtn) {
        refreshBtn.disabled = show;
        refreshBtn.innerHTML = show ? '<i class="fas fa-spinner fa-spin"></i> Carregando...' : '<i class="fas fa-sync-alt"></i> Atualizar';
    }
}

// Mostrar notificação
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remover após 5 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Auto-refresh
function startAutoRefresh() {
    setInterval(() => {
        if (isAuthenticated) {
            loadTransactions();
        }
    }, 30000); // 30 segundos
}

// Funções globais para uso no HTML
window.viewTransaction = viewTransaction;
