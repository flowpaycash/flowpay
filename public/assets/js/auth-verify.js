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
  n.innerHTML = `<span>${msg}</span><button class="nf-x" aria-label="Fechar">×</button>`;
  holder.appendChild(n);
  n.querySelector('.nf-x').onclick = () => n.remove();
  setTimeout(() => n.remove(), 4200);
};

// Função para extrair parâmetros da URL
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Função para verificar o token
async function verifyToken(token) {
  try {
    const response = await fetch('/api/auth/magic-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Falha na verificação');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

// Função principal de verificação
async function performVerification() {
  const token = getUrlParameter('token');

  if (!token) {
    showError('Token não fornecido na URL');
    return;
  }

  try {
    const result = await verifyToken(token);

    if (result.success) {
      showSuccess();
      toast('Acesso verificado com sucesso!', 'success');

      // Redirecionar após 2 segundos
      setTimeout(() => {
        window.location.href = '/client';
      }, 2000);
    } else {
      showError('Falha na verificação do token');
    }
  } catch (error) {
    // Verification error
    showError(error.message || 'Erro desconhecido na verificação');
  }
}

// Função para mostrar sucesso
function showSuccess() {
  document.getElementById('verification-status').style.display = 'none';
  document.getElementById('verification-result').style.display = 'block';
  document.getElementById('success-message').style.display = 'block';
}

// Função para mostrar erro
function showError(message) {
  document.getElementById('verification-status').style.display = 'none';
  document.getElementById('verification-result').style.display = 'block';
  document.getElementById('error-message').style.display = 'block';
  document.getElementById('error-details').textContent = message;
}

// Iniciar verificação quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  performVerification();
});
