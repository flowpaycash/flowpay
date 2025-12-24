const toast = (msg, type='info') => {
  let holder = document.getElementById('nf-toasts');
  if (!holder) { 
    holder = document.createElement('div'); 
    holder.id='nf-toasts'; 
    holder.className='nf-toasts'; 
    document.body.appendChild(holder); 
  }
  const n = document.createElement('div');
  n.className = `nf-toast is-${type}`;
  n.innerHTML = `<span>${msg}</span><button class="nf-x" aria-label="Fechar">×</button>`;
  holder.appendChild(n);
  n.querySelector('.nf-x').onclick = () => n.remove();
  setTimeout(()=>n.remove(), 4200);
};

document.getElementById('magic-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = new FormData(e.currentTarget).get('email');
  try {
    const res = await fetch('/.netlify/functions/auth-magic-start', {
      method:'POST', 
      headers:{'Content-Type':'application/json'},
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
  // Placeholder SIWE — você pode ligar no seu connectWallet + fluxo SIWE depois
  if (!window.connectWallet) return toast('Integração de carteira indisponível.', 'error');
  try {
    const ok = await window.connectWallet();
    if (!ok) throw new Error('Falha na carteira');
    // TODO: chamar /.netlify/functions/siwe-challenge e depois /siwe-verify
    window.location.href = '/client';
  } catch (e) {
    toast('Erro ao conectar carteira', 'error');
  }
});
