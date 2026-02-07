// FLOWPay - Content Security Policy Configuration
// Resolve problemas de CSP para PWA - Versão corrigida

// Evitar carregamento múltiplo
if (window.FLOWPayCSP && window.FLOWPayCSP.loaded) {
  // CSP already loaded
} else {
  (function() {
    'use strict';
    
    // Configuring CSP for FLOWPay

    // Configuração CSP otimizada (sem frame-ancestors - já configurado no Netlify)
    const cspConfig = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
        "https://unpkg.com"
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com"
      ],
      'img-src': [
        "'self'",
        "data:",
        "https:",
        "blob:"
      ],
      'font-src': [
        "'self'",
        "https://cdnjs.cloudflare.com"
      ],
      'connect-src': [
        "'self'",
        "https://api.woovi.com",
        "https://api.woovi-sandbox.com",
        "https://rpc.ankr.com",
        "https://etherscan.io",
        "https://*.walletconnect.com",
        "https://*.web3auth.io",
        "https://*.torus.sh",
        "https://mainnet.infura.io"
      ],
      'frame-src': [
        "'self'",
        "https://*.web3auth.io",
        "https://*.walletconnect.com"
      ],
      'worker-src': [
        "'self'",
        "blob:"
      ],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
      // frame-ancestors removido - já configurado no Netlify
    };

    // Aplicar CSP apenas se não estiver em produção (Netlify)
    function applyCSP() {
      try {
        // Verificar se estamos em produção (Netlify)
        const isProduction = window.location.hostname.includes('flowpay.cash') || window.location.hostname.includes('netlify.app');
        
        if (isProduction) {
          // Production detected - CSP configured server-side
          return true;
        }
        
        // Local environment - applying CSP locally
        
        // Criar meta tag CSP apenas para desenvolvimento local
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        
        // Converter configuração para string
        const cspString = Object.entries(cspConfig)
          .map(([key, values]) => `${key} ${values.join(' ')}`)
          .join('; ');
        
        meta.content = cspString;
        
        // Remover CSP existente se houver
        const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (existingCSP) {
          existingCSP.remove();
        }
        
        // Adicionar novo CSP
        document.head.appendChild(meta);
        
        // CSP applied successfully
        
        return true;
      } catch (error) {
        // CSP application error
        return false;
      }
    }

    // Aplicar CSP quando DOM estiver pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyCSP);
    } else {
      applyCSP();
    }

    // Verificar se CSP está funcionando
    setTimeout(() => {
      try {
        // Teste básico
        const testScript = document.createElement('script');
        testScript.textContent = '// CSP verification passed';
        document.head.appendChild(testScript);

        // CSP verification completed
      } catch (error) {
        // CSP verification error
      }
    }, 200);

    // Exportar para uso global
    window.FLOWPayCSP = {
      apply: applyCSP,
      config: cspConfig,
      isProduction: () => window.location.hostname.includes('flowpay.cash') || window.location.hostname.includes('netlify.app'),
      loaded: true
    };

    // CSP configured
  })();
}
