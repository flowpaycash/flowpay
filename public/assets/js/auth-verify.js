(() => {
  const statusEl = document.getElementById("verification-status");
  const resultEl = document.getElementById("verification-result");
  const successEl = document.getElementById("success-message");
  const errorEl = document.getElementById("error-message");
  const errorDetailsEl = document.getElementById("error-details");

  const setError = (message) => {
    if (statusEl) statusEl.style.display = "none";
    if (resultEl) resultEl.style.display = "block";
    if (successEl) successEl.style.display = "none";
    if (errorEl) errorEl.style.display = "block";
    if (errorDetailsEl) errorDetailsEl.textContent = message;
  };

  const setSuccess = () => {
    if (statusEl) statusEl.style.display = "none";
    if (resultEl) resultEl.style.display = "block";
    if (errorEl) errorEl.style.display = "none";
    if (successEl) successEl.style.display = "block";
  };

  const run = async () => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");

    if (!token) {
      setError("Token ausente ou inválido.");
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
        setError(data.error || "Não foi possível validar seu acesso.");
        return;
      }

      setSuccess();
      window.setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (_err) {
      setError("Erro de conexão ao validar seu acesso.");
    }
  };

  void run();
})();
