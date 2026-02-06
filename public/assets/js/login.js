const toast = (msg, type = 'info') => {
  let holder = document.getElementById('nf-toasts');
  if (!holder) {
    holder = document.createElement('div');
    holder.id = 'nf-toasts';
    holder.className = 'nf-toasts';
    document.body.appendChild(holder);
  }
  const n = document.createElement('div');
  n.className = `nf-toast is-${type}`;
  const span = document.createElement('span');
  span.textContent = msg; // textContent prevents XSS
  const btn = document.createElement('button');
  btn.className = 'nf-x';
  btn.setAttribute('aria-label', 'Fechar');
  btn.textContent = '\u00d7';
  btn.onclick = () => n.remove();
  n.appendChild(span);
  n.appendChild(btn);
  holder.appendChild(n);
  setTimeout(() => n.remove(), 4200);
};

document.getElementById('magic-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = new FormData(e.currentTarget).get('email');
  try {
    const res = await fetch('/api/auth/magic-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) throw new Error('Falha ao solicitar link');
    const { sent } = await res.json();
    toast(sent ? 'Link enviado. Confira seu e-mail.' : 'Link gerado (dev). Veja o console.', 'success');
  } catch (err) {
    toast(err.message || 'Erro ao enviar link', 'error');
  }
});

document.getElementById('wallet-login')?.addEventListener('click', async () => {
  const btn = document.getElementById('wallet-login');

  // Get a provider: either Web3Auth or MetaMask/injected
  const provider = window.__provider || window.ethereum;

  // If no provider yet, try connectWallet (Web3Auth lazy load or injected)
  if (!provider) {
    if (!window.connectWallet) return toast('Instale uma carteira (MetaMask) ou aguarde o carregamento.', 'error');
    try {
      btn.disabled = true;
      btn.textContent = 'Conectando...';
      const ok = await window.connectWallet();
      if (!ok) throw new Error('Falha na carteira');
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'Entrar com carteira';
      return toast('Erro ao conectar carteira', 'error');
    }
  }

  // Now we have a provider - execute SIWE flow
  const activeProvider = window.__provider || window.ethereum;
  if (!activeProvider) {
    btn.disabled = false;
    btn.textContent = 'Entrar com carteira';
    return toast('Provedor de carteira não encontrado', 'error');
  }

  try {
    btn.disabled = true;
    btn.textContent = 'Assinando...';

    // 1. Get wallet address
    let accounts;
    if (activeProvider.request) {
      accounts = await activeProvider.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        accounts = await activeProvider.request({ method: 'eth_requestAccounts' });
      }
    } else if (activeProvider.getAccounts) {
      accounts = await activeProvider.getAccounts();
    }

    if (!accounts || accounts.length === 0) {
      throw new Error('Nenhuma conta encontrada na carteira');
    }

    const address = accounts[0];

    // 2. Request SIWE challenge from server
    const challengeRes = await fetch('/api/auth/siwe-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    });

    if (!challengeRes.ok) {
      const err = await challengeRes.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao gerar challenge');
    }

    const { nonce, domain, origin, chainId } = await challengeRes.json();

    // 3. Build SIWE message (EIP-4361 format)
    const issuedAt = new Date().toISOString();
    const expirationTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const siweMessage = [
      `${domain} wants you to sign in with your Ethereum account:`,
      address,
      '',
      'Sign in to FlowPay',
      '',
      `URI: ${origin}`,
      `Version: 1`,
      `Chain ID: ${chainId}`,
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`,
      `Expiration Time: ${expirationTime}`
    ].join('\n');

    // 4. Request signature from wallet
    let signature;
    if (activeProvider.request) {
      signature = await activeProvider.request({
        method: 'personal_sign',
        params: [siweMessage, address]
      });
    } else {
      throw new Error('Provedor não suporta personal_sign');
    }

    // 5. Verify signature on server
    btn.textContent = 'Verificando...';

    const verifyRes = await fetch('/api/auth/siwe-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: siweMessage, signature })
    });

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));
      throw new Error(err.error || 'Falha na verificação');
    }

    const result = await verifyRes.json();

    if (result.success) {
      toast('Carteira verificada com sucesso!', 'success');
      setTimeout(() => { window.location.href = '/client'; }, 800);
    } else {
      throw new Error('Verificação falhou');
    }

  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Entrar com carteira';
    toast(e.message || 'Erro na autenticação com carteira', 'error');
  }
});
