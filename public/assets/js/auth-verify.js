const statusEl = document.getElementById("verification-status");
const resultEl = document.getElementById("verification-result");
const successEl = document.getElementById("success-message");
const errorEl = document.getElementById("error-message");
const errorDetailsEl = document.getElementById("error-details");

function showError(message) {
  if (statusEl) statusEl.style.display = "none";
  if (resultEl) resultEl.style.display = "block";
  if (successEl) successEl.style.display = "none";
  if (errorEl) errorEl.style.display = "block";
  if (errorDetailsEl) errorDetailsEl.textContent = message;
}

function showSuccess() {
  if (statusEl) statusEl.style.display = "none";
  if (resultEl) resultEl.style.display = "block";
  if (errorEl) errorEl.style.display = "none";
  if (successEl) successEl.style.display = "block";
}

async function runMagicVerify() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (!token) {
    showError("Token ausente. Solicite um novo link de acesso.");
    return;
  }

  try {
    const response = await fetch("/api/auth/magic-verify", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      showError(
        data.error || "Nao foi possivel validar o link. Tente novamente."
      );
      return;
    }

    showSuccess();
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1200);
  } catch {
    showError("Falha de conexao ao validar o link.");
  }
}

runMagicVerify();
