/**
 * LAYOUT INJECTOR - INJEÇÃO DINÂMICA DE COMPONENTES NEO
 * Sistema de injeção de layout para FLOWPay
 */

class NeoLayoutInjector {
    constructor() {
        this.components = {};
        this.walletStatus = 'disconnected';
        this.transactionLogs = [];
        this.init();
    }

    async init() {
        console.log('🚀 NEO Layout Injector iniciando...');
        await this.loadComponents();
        this.injectNavbar();
        
                    // Aguardar um pouco para garantir que o DOM esteja pronto
            setTimeout(() => {
                this.injectSidebar();
                this.setupWalletStatus();
                this.setupTransactionSimulation();
                this.setupRippleEffects();
            }, 500); // Aumentado para 500ms
        }

    async loadComponents() {
        try {
            // Carregar navbar
            const navbarResponse = await fetch('/snippets/navbar.html');
            this.components.navbar = await navbarResponse.text();
            
            // Carregar outros componentes se necessário
            console.log('✅ Componentes NEO carregados');
        } catch (error) {
            console.error('❌ Erro ao carregar componentes:', error);
        }
    }

    injectNavbar() {
        console.log('🔍 Injetando navbar...');
        
        // Remover navbar existente se houver
        const existingNavbar = document.querySelector('.neo-navbar');
        if (existingNavbar) {
            existingNavbar.remove();
            console.log('🗑️ Navbar existente removida');
        }

        const navbarContainer = document.createElement('div');
        navbarContainer.innerHTML = this.components.navbar;
        
        // Inserir no início do body
        const navbarElement = navbarContainer.firstElementChild;
        document.body.insertBefore(navbarElement, document.body.firstChild);
        
        console.log('✅ Navbar inserida no DOM:', navbarElement);

        // Configurar menu mobile
        this.setupMobileMenu();
        
        console.log('🎯 Navbar NEO injetada com sucesso');
    }

    injectSidebar() {
        // Só injeta sidebar se estiver na página admin
        if (window.location.pathname.includes('/admin')) {
            this.createAdminSidebar();
        }
    }

    createAdminSidebar() {
        // Carregar sidebar modular
        fetch('/snippets/sidebar.html')
            .then(response => response.text())
            .then(sidebarHTML => {
                const sidebarContainer = document.createElement('div');
                sidebarContainer.innerHTML = sidebarHTML;
                document.body.insertBefore(sidebarContainer.firstElementChild, document.body.firstChild);
                
                // Adicionar classe admin-body
                document.body.classList.add('admin-body');
                
                // Criar layout admin
                this.createAdminLayout();
                
                console.log('🎯 Sidebar Admin NEO modular criada');
            })
            .catch(error => {
                console.error('❌ Erro ao carregar sidebar:', error);
                // Fallback para sidebar inline
                this.createInlineSidebar();
            });
    }
    
    createInlineSidebar() {
        const sidebarHTML = `
            <div class="admin-sidebar">
                <div class="sidebar-header">
                    <div class="sidebar-logo">
                        <img src="/img/flowpay-logo.png" alt="FLOWPay">
                        <div class="sidebar-logo-text">FLOWPay</div>
                    </div>
                    <div class="sidebar-version">v2.2.0</div>
                </div>
                
                <nav class="sidebar-nav">
                    <div class="nav-section">
                        <div class="nav-section-title">Dashboard</div>
                        <div class="nav-item">
                            <a href="/admin" class="nav-link active">
                                <i class="fas fa-chart-line"></i>
                                <span>Visão Geral</span>
                            </a>
                        </div>
                        <div class="nav-item">
                            <a href="/admin/transactions" class="nav-link">
                                <i class="fas fa-exchange-alt"></i>
                                <span>Transações</span>
                            </a>
                        </div>
                    </div>
                    
                    <div class="nav-section">
                        <div class="nav-section-title">Sistema</div>
                        <div class="nav-item">
                            <a href="/admin/settings" class="nav-link">
                                <i class="fas fa-cog"></i>
                                <span>Configurações</span>
                            </a>
                        </div>
                        <div class="nav-item">
                            <a href="/admin/logs" class="nav-link">
                                <i class="fas fa-terminal"></i>
                                <span>Logs</span>
                            </a>
                        </div>
                    </div>
                </nav>
            </div>
        `;

        const sidebarContainer = document.createElement('div');
        sidebarContainer.innerHTML = sidebarHTML;
        document.body.insertBefore(sidebarContainer.firstElementChild, document.body.firstChild);

        // Adicionar classe admin-body
        document.body.classList.add('admin-body');
        
        // Criar layout admin
        this.createAdminLayout();
        
        console.log('🎯 Sidebar Admin NEO criada');
    }

    createAdminLayout() {
        const mainContent = document.querySelector('main') || document.querySelector('.admin-content');
        if (mainContent) {
            mainContent.classList.add('admin-main');
        }
    }

    setupWalletStatus() {
        const walletIndicator = document.getElementById('nav-wallet-status');
        if (!walletIndicator) return;

        // Simular status da carteira
        this.updateWalletStatus('disconnected');
        
        // Listener para mudanças de status
        window.addEventListener('wallet-status-change', (event) => {
            this.updateWalletStatus(event.detail.status);
        });
    }

    updateWalletStatus(status) {
        const walletIndicator = document.getElementById('nav-wallet-status');
        if (!walletIndicator) return;

        this.walletStatus = status;
        
        const indicator = walletIndicator.querySelector('.wallet-indicator');
        const statusText = walletIndicator.querySelector('.status-text');
        
        indicator.className = `wallet-indicator ${status}`;
        
        switch (status) {
            case 'connected':
                statusText.textContent = 'Conectado';
                break;
            case 'connecting':
                statusText.textContent = 'Conectando...';
                break;
            case 'disconnected':
            default:
                statusText.textContent = 'Desconectado';
                break;
        }
    }

    setupTransactionSimulation() {
        // Simular logs de transação cripto
        this.simulateCryptoTransaction();
        
        // Adicionar logs fake no checkout
        this.addFakeTransactionLogs();
    }

    simulateCryptoTransaction() {
        const transactionSteps = [
            '🔍 Verificando rede blockchain...',
            '📡 Conectando ao RPC...',
            '💰 Calculando gas fees...',
            '🔐 Assinando transação...',
            '📤 Enviando para mempool...',
            '⏳ Aguardando confirmação...',
            '✅ Transação confirmada!'
        ];

        let currentStep = 0;
        
        setInterval(() => {
            if (currentStep < transactionSteps.length) {
                this.addTransactionLog(transactionSteps[currentStep], 'info');
                currentStep++;
            }
        }, 2000);
    }

    addFakeTransactionLogs() {
        const checkoutPage = document.querySelector('.checkout-container') || document.querySelector('.pix-checkout');
        if (checkoutPage) {
            this.createTransactionLogsContainer(checkoutPage);
        }
    }

    createTransactionLogsContainer(container) {
        const logsContainer = document.createElement('div');
        logsContainer.className = 'transaction-logs';
        logsContainer.innerHTML = `
            <div class="logs-header">
                <h3>📊 Logs de Transação</h3>
                <button class="btn-clear-logs">Limpar</button>
            </div>
            <div class="logs-content"></div>
        `;
        
        container.appendChild(logsContainer);
        
        // Adicionar logs iniciais
        this.addTransactionLog('🚀 Sistema de checkout iniciado', 'success');
        this.addTransactionLog('🔗 Conectando à rede blockchain...', 'info');
    }

    addTransactionLog(message, type = 'info') {
        const logsContent = document.querySelector('.logs-content');
        if (!logsContent) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-message">${message}</span>
        `;
        
        logsContent.appendChild(logEntry);
        logsContent.scrollTop = logsContent.scrollHeight;
        
        // Adicionar à lista global
        this.transactionLogs.push({ message, type, timestamp });
        
        // Limitar logs
        if (this.transactionLogs.length > 50) {
            this.transactionLogs.shift();
            if (logsContent.firstChild) {
                logsContent.removeChild(logsContent.firstChild);
            }
        }
    }

    setupRippleEffects() {
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-neo-ripple]');
            if (target) {
                this.createRippleEffect(event, target);
            }
        });
    }

    setupMobileMenu() {
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        console.log('🔍 Setup Mobile Menu:', { mobileToggle, navMenu });
        
        if (mobileToggle && navMenu) {
            mobileToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🍔 Mobile toggle clicked!');
                
                navMenu.classList.toggle('active');
                mobileToggle.classList.toggle('active');
                
                console.log('📱 Menu state:', {
                    menuActive: navMenu.classList.contains('active'),
                    toggleActive: mobileToggle.classList.contains('active')
                });
                
                // Animar hamburger
                const spans = mobileToggle.querySelectorAll('.hamburger span');
                spans.forEach((span, index) => {
                    if (mobileToggle.classList.contains('active')) {
                        if (index === 0) span.style.transform = 'rotate(45deg) translate(5px, 5px)';
                        if (index === 1) span.style.opacity = '0';
                        if (index === 2) span.style.transform = 'rotate(-45deg) translate(7px, -6px)';
                    } else {
                        span.style.transform = 'none';
                        span.style.opacity = '1';
                    }
                });
            });
            
            console.log('✅ Menu mobile configurado com sucesso');
        } else {
            console.error('❌ Elementos do menu mobile não encontrados:', { mobileToggle, navMenu });
        }
    }

    createRippleEffect(event, element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: neo-ripple 0.6s linear;
            pointer-events: none;
        `;
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // Métodos utilitários
    getWalletStatus() {
        return this.walletStatus;
    }

    getTransactionLogs() {
        return this.transactionLogs;
    }

    clearLogs() {
        this.transactionLogs = [];
        const logsContent = document.querySelector('.logs-content');
        if (logsContent) {
            logsContent.innerHTML = '';
        }
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.neoLayout = new NeoLayoutInjector();
});

// Adicionar CSS para efeitos
const neoStyles = `
    @keyframes neo-ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .transaction-logs {
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid #333;
        border-radius: 8px;
        margin-top: 2rem;
        font-family: 'Courier New', monospace;
    }
    
    .logs-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #333;
        background: rgba(255, 0, 122, 0.1);
    }
    
    .logs-content {
        max-height: 300px;
        overflow-y: auto;
        padding: 1rem;
    }
    
    .log-entry {
        padding: 0.5rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 0.9rem;
    }
    
    .log-timestamp {
        color: #666;
        margin-right: 0.5rem;
    }
    
    .log-success { color: #00ff88; }
    .log-info { color: #00d4ff; }
    .log-warning { color: #ffaa00; }
    .log-error { color: #ff4444; }
    
    .btn-clear-logs {
        background: #ff007a;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        font-size: 0.8rem;
        cursor: pointer;
    }
    
    .btn-clear-logs:hover {
        background: #ff1a8c;
    }
`;

// Injetar estilos
const styleSheet = document.createElement('style');
styleSheet.textContent = neoStyles;
document.head.appendChild(styleSheet);

console.log('🚀 NEO Layout Injector carregado e pronto para ação!');
