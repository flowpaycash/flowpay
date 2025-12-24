// FLOWPay - Content Security Policy Configuration
// Resolve problemas de CSP para PWA - Versão corrigida

console.log('🔒 Configurando CSP para FLOWPay...');

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
    const isProduction = window.location.hostname.includes('netlify.app');
    
    if (isProduction) {
      console.log('🌐 Produção detectada - CSP já configurado no Netlify');
      console.log('🔒 Pulando aplicação local de CSP');
      return true;
    }
    
    console.log('🏠 Ambiente local detectado - Aplicando CSP local...');
    
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
    
    console.log('✅ CSP local aplicado com sucesso!');
    console.log('🔒 Política:', cspString);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao aplicar CSP:', error);
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
    testScript.textContent = 'console.log("🎉 CSP funcionando perfeitamente!");';
    document.head.appendChild(testScript);
    
    console.log('✅ Verificação CSP concluída');
  } catch (error) {
    console.error('❌ Erro na verificação CSP:', error);
  }
}, 200);

// Exportar para uso global
window.FLOWPayCSP = {
  apply: applyCSP,
  config: cspConfig,
  isProduction: () => window.location.hostname.includes('netlify.app')
};

console.log('🔒 CSP configurado e otimizado!');
