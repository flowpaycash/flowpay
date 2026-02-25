// FLOWPay - Admin Panel JavaScript
// Painel administrativo para gerenciar transações e usuários

let transactions = [];
let pendingUsers = [];
let isAuthenticated = false;
let autoRefreshTimer = null;
let transactionsLoaded = false;
const MOBILE_BREAKPOINT = 900;

document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();

  const authenticated = await checkAuthentication();
  if (authenticated) {
    showAdminPanel();
    await loadAll();
  } else {
    showLoginScreen();
  }
});

function setupEventListeners() {
  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) refreshBtn.addEventListener("click", () => loadAll());

  const downloadBtn = document.getElementById("download-btn");
  if (downloadBtn) downloadBtn.addEventListener("click", downloadTransactions);

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => handleLogout(true));

  const statusFilter = document.getElementById("status-filter");
  if (statusFilter) statusFilter.addEventListener("change", renderTransactions);

  const moedaFilter = document.getElementById("moeda-filter");
  if (moedaFilter) moedaFilter.addEventListener("change", renderTransactions);

  const userStatusFilter = document.getElementById("user-status-filter");
  if (userStatusFilter) {
    userStatusFilter.addEventListener("change", () => loadPendingUsers());
  }

  const loadTransactionsBtn = document.getElementById("load-transactions-btn");
  if (loadTransactionsBtn) {
    loadTransactionsBtn.addEventListener("click", handleTransactionsToggle);
  }

  window.addEventListener("resize", configureMobileTransactionsMode);
}

function isMobileAdminView() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}

function isTransactionsBlockOpen() {
  return document
    .getElementById("transactions-block")
    ?.classList.contains("open");
}

function updateTransactionsToggleLabel() {
  const button = document.getElementById("load-transactions-btn");
  if (!button) return;

  if (!isMobileAdminView()) {
    button.hidden = true;
    return;
  }

  button.hidden = false;
  if (!transactionsLoaded) {
    button.textContent = "Carregar transações";
    return;
  }

  button.textContent = isTransactionsBlockOpen()
    ? "Ocultar transações"
    : "Ver transações";
}

function configureMobileTransactionsMode() {
  const block = document.getElementById("transactions-block");
  if (!block) return;

  if (isMobileAdminView()) {
    block.classList.add("mobile-collapsed");
    if (!isTransactionsBlockOpen()) block.classList.remove("open");
  } else {
    block.classList.remove("mobile-collapsed");
    block.classList.add("open");
  }

  updateTransactionsToggleLabel();
}

async function checkAuthentication() {
  try {
    const res = await fetch("/api/admin/auth/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!res.ok) {
      isAuthenticated = false;
      return false;
    }

    const data = await safeJson(res);
    isAuthenticated = Boolean(data?.authenticated);
    return isAuthenticated;
  } catch {
    isAuthenticated = false;
    return false;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const passwordInput = document.getElementById("password");
  const submitBtn = document.querySelector("#login-form .btn-login");
  const password = passwordInput?.value || "";

  if (!password) {
    showNotification("❌ Informe a senha de acesso.", "error");
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Entrando...";
  }

  try {
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const data = await safeJson(res);
      showNotification(`❌ ${data.error || "Senha incorreta."}`, "error");
      return;
    }

    isAuthenticated = true;
    if (passwordInput) passwordInput.value = "";
    showAdminPanel();
    await loadAll();
    showNotification("✅ Login realizado com sucesso!", "success");
  } catch {
    showNotification("❌ Erro de conexão. Tente novamente.", "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Acessar Painel";
    }
  }
}

async function handleLogout(showToast = true) {
  try {
    await fetch("/api/admin/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Ignore network errors on logout; local cleanup still happens.
  } finally {
    isAuthenticated = false;
    showLoginScreen();
    if (showToast) showNotification("👋 Logout realizado.", "info");
  }
}

async function handleSessionExpired() {
  if (!isAuthenticated) return;
  isAuthenticated = false;
  showLoginScreen();
  showNotification("⚠️ Sessão expirada. Faça login novamente.", "warning");
}

function getAuthHeaders() {
  return { "Content-Type": "application/json" };
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
  });

  if (res.status === 401) {
    await handleSessionExpired();
    throw new Error("UNAUTHORIZED");
  }

  return res;
}

async function loadAll() {
  if (!isAuthenticated) return;

  const shouldLoadTransactions =
    !isMobileAdminView() || (transactionsLoaded && isTransactionsBlockOpen());

  const tasks = [loadPendingUsers(), loadMetrics()];
  if (shouldLoadTransactions) tasks.push(loadTransactions(false));

  await Promise.allSettled(tasks);
}

async function handleTransactionsToggle() {
  const block = document.getElementById("transactions-block");
  if (!block) return;

  if (!block.classList.contains("open")) {
    block.classList.add("open");
    if (!transactionsLoaded) {
      await loadTransactions(false);
    } else {
      renderTransactions();
    }
  } else {
    block.classList.remove("open");
  }

  updateTransactionsToggleLabel();
}

async function loadMetrics() {
  try {
    const res = await apiFetch("/api/admin/metrics", {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return;

    const data = await safeJson(res);
    if (data.success && data.metrics) {
      const m = data.metrics;
      setEl("pending-count", m.payments_24h ?? 0);
      setEl("paid-count", m.payments_24h ?? 0);
      setEl("processed-count", m.total_wallets ?? 0);
      setEl("total-value", `R$ ${Number(m.volume_24h || 0).toFixed(2)}`);
      setEl("poe-count", m.poe_proved_txs ?? 0);

      // Render Verified Proofs
      const proofsTbody = document.getElementById("verified-proofs-tbody");
      if (proofsTbody && m.recent_proofs) {
        if (m.recent_proofs.length === 0) {
          proofsTbody.innerHTML = '<tr><td colspan="4" class="no-data">Nenhuma prova verificada encontrada.</td></tr>';
        } else {
          proofsTbody.innerHTML = m.recent_proofs.map(p => {
            const date = new Date(p.timestamp).toLocaleString('pt-BR');
            const explorerUrl = p.blockchain_tx && p.blockchain_tx !== 'Manual Proof'
              ? `https://basescan.org/tx/${p.blockchain_tx}`
              : '#';
            const txDisplay = p.blockchain_tx === 'Manual Proof'
              ? '<i>Assinado (Local)</i>'
              : `<a href="${explorerUrl}" target="_blank" style="color: var(--secondary)">${p.blockchain_tx.substring(0, 16)}...</a>`;
            const idDisplay = p.type === 'ORDER' ? `Order: ${p.id.substring(0, 8)}` : `Batch #${p.id}`;

            return `
              <tr>
                <td><span class="badge ${p.type === 'BATCH' ? 'badge-processed' : 'badge-paid'}">${p.type}</span></td>
                <td><code>${idDisplay}</code></td>
                <td>${txDisplay}</td>
                <td>${date}</td>
              </tr>
            `;
          }).join('');
        }
      }
    }
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      showNotification("❌ Erro ao carregar métricas.", "error");
    }
  }
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

async function loadTransactions(showToast = true) {
  try {
    showLoading(true);
    const res = await apiFetch("/api/admin/orders", {
      headers: getAuthHeaders(),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await safeJson(res);
    transactions = data.orders || [];
    transactionsLoaded = true;
    updateStatistics();
    renderTransactions();

    if (showToast) {
      showNotification(
        `✅ ${transactions.length} transações carregadas`,
        "success"
      );
    }
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      showNotification("❌ Erro ao carregar transações", "error");
    }
  } finally {
    showLoading(false);
  }
}

function updateStatistics() {
  const pending = transactions.filter((t) =>
    ["CREATED"].includes(t.status)
  ).length;
  const paid = transactions.filter((t) =>
    ["PIX_PAID", "PENDING_REVIEW", "APPROVED"].includes(t.status)
  ).length;
  const completed = transactions.filter((t) => t.status === "COMPLETED").length;
  const total = transactions.reduce(
    (s, t) => s + (parseFloat(t.amount_brl) || 0),
    0
  );

  setEl("pending-count", pending);
  setEl("paid-count", paid);
  setEl("processed-count", completed);
  setEl("total-value", `R$ ${total.toFixed(2)}`);
}

function renderTransactions() {
  const tbody = document.getElementById("transactions-tbody");
  if (!tbody) return;

  const statusFilter = document.getElementById("status-filter")?.value || "";
  const moedaFilter = document.getElementById("moeda-filter")?.value || "";

  let filtered = transactions;
  if (statusFilter)
    filtered = filtered.filter((t) => t.status === statusFilter);
  if (moedaFilter) {
    filtered = filtered.filter(
      (t) => (t.metadata || "").includes(moedaFilter) || moedaFilter === "BRL"
    );
  }

  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="no-data">Nenhuma transação encontrada</td></tr>';
    return;
  }

  filtered.forEach((t) => {
    const row = document.createElement("tr");
    const shortId = esc(
      t.charge_id ? t.charge_id.substring(0, 12) + "..." : t.id
    );
    const wallet = t.customer_wallet
      ? esc(t.customer_wallet.slice(0, 6) + "..." + t.customer_wallet.slice(-4))
      : "N/A";
    const date = t.created_at
      ? new Date(t.created_at).toLocaleString("pt-BR")
      : "N/A";
    const canComplete = ["PIX_PAID", "PENDING_REVIEW", "APPROVED"].includes(
      t.status
    );

    row.innerHTML = `
      <td><code title="${esc(t.charge_id)}">${shortId}</code></td>
      <td>${getStatusBadge(t.status)}</td>
      <td>BRL</td>
      <td>R$ ${Number(t.amount_brl || 0).toFixed(2)}</td>
      <td><code>${wallet}</code></td>
      <td>${date}</td>
      <td>
        ${canComplete ? `<button class="btn-complete" data-id="${esc(t.charge_id)}">✅ Concluir</button>` : '<span style="opacity:.4">—</span>'}
      </td>
    `;

    if (canComplete) {
      row.querySelector(".btn-complete")?.addEventListener("click", (ev) => {
        completeOrder(ev.target.dataset.id);
      });
    }

    tbody.appendChild(row);
  });
}

async function completeOrder(chargeId) {
  if (!confirm(`Confirmar conclusão do pedido ${chargeId}?`)) return;

  try {
    showLoading(true);
    const res = await apiFetch("/api/admin/orders", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "complete", chargeId }),
    });
    const data = await safeJson(res);

    if (data.success) {
      showNotification("✅ Pedido concluído!", "success");
      await loadTransactions(false);
    } else {
      showNotification(
        `❌ ${data.error || "Erro ao concluir pedido"}`,
        "error"
      );
    }
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      showNotification("❌ Erro ao concluir pedido", "error");
    }
  } finally {
    showLoading(false);
  }
}

async function loadPendingUsers() {
  try {
    const selectedStatus =
      document.getElementById("user-status-filter")?.value ||
      "PENDING_APPROVAL";
    const query = selectedStatus
      ? `?status=${encodeURIComponent(selectedStatus)}`
      : "";

    const res = await apiFetch(`/api/admin/users${query}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return;
    const data = await safeJson(res);
    pendingUsers = data.users || [];
    renderPendingUsers();
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      showNotification("❌ Erro ao carregar usuários pendentes.", "error");
    }
  }
}

function renderPendingUsers() {
  const container = document.getElementById("settlement-orders-container");
  if (!container) return;

  const selectedStatus =
    document.getElementById("user-status-filter")?.value || "PENDING_APPROVAL";
  const emptyByStatus = {
    PENDING_APPROVAL: "Nenhum cadastro aguardando aprovação",
    APPROVED: "Nenhum usuário aprovado encontrado",
    REJECTED: "Nenhum usuário rejeitado encontrado",
    "": "Nenhum usuário encontrado",
  };

  if (pendingUsers.length === 0) {
    container.innerHTML = `<p class="no-orders">${emptyByStatus[selectedStatus] || emptyByStatus[""]}</p>`;
    return;
  }

  container.innerHTML = pendingUsers
    .map(
      (u) => `
      <div class="user-card">
        <div class="user-card-header">
          <span class="user-card-id">#${esc(String(u.id))}</span>
          ${getUserStatusBadge(u.status)}
        </div>
        
        <div class="user-main-info">
          <div class="user-name">${esc(u.name)}</div>
          <div class="user-email-chip">${esc(u.email)}</div>
        </div>

        <div class="user-details-grid">
          <div class="user-detail-item">
            <span class="lbl">${esc(u.document_type || "CPF")}</span>
            <span class="val highlight">${u.cpf ? esc(u.cpf) : "—"}</span>
          </div>
          <div class="user-detail-item">
            <span class="lbl">Segmento</span>
            <span class="val">${esc(u.business_type || "—")}</span>
          </div>
          <div class="user-detail-item">
            <span class="lbl">WhatsApp</span>
            <span class="val">${u.phone ? esc(u.phone) : "—"}</span>
          </div>
          <div class="user-detail-item">
            <span class="lbl">Cadastro</span>
            <span class="val">${new Date(u.created_at).toLocaleString("pt-BR", { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
        </div>

        ${u.status === "PENDING_APPROVAL"
          ? `<div class="user-card-actions">
          <button class="btn btn-success btn-approve" data-user-id="${u.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Aprovar
          </button>
          <button class="btn btn-outline btn-reject" data-user-id="${u.id}">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            Rejeitar
          </button>
        </div>`
          : ""
        }
      </div>
    `
    )
    .join("");

  container.querySelectorAll(".btn-approve").forEach((btn) => {
    btn.addEventListener("click", () =>
      handleUserAction(btn.dataset.userId, "approve")
    );
  });
  container.querySelectorAll(".btn-reject").forEach((btn) => {
    btn.addEventListener("click", () =>
      handleUserAction(btn.dataset.userId, "reject")
    );
  });
}

async function handleUserAction(userId, action) {
  const label = action === "approve" ? "aprovar" : "rejeitar";
  if (!confirm(`Confirmar ${label} usuário ID ${userId}?`)) return;

  let reason = null;
  if (action === "reject") {
    reason =
      prompt("Motivo da rejeição (opcional):") ||
      "Reprovado pelo administrador";
  }

  try {
    const res = await apiFetch("/api/admin/users", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, userId: parseInt(userId, 10), reason }),
    });
    const data = await safeJson(res);

    if (data.success) {
      showNotification(
        `✅ Usuário ${label === "aprovar" ? "aprovado" : "rejeitado"}!`,
        "success"
      );
      await loadPendingUsers();
    } else {
      showNotification(
        `❌ ${data.error || "Erro na ação de usuário"}`,
        "error"
      );
    }
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      showNotification(`❌ Erro ao ${label} usuário`, "error");
    }
  }
}

function showAdminPanel() {
  const loginScreen = document.getElementById("login-screen");
  const adminPanel = document.getElementById("admin-panel");
  if (loginScreen) loginScreen.style.display = "none";
  if (adminPanel) adminPanel.style.display = "flex";

  configureMobileTransactionsMode();

  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(() => {
    if (isAuthenticated) loadAll();
  }, 30000);
}

function showLoginScreen() {
  const loginScreen = document.getElementById("login-screen");
  const adminPanel = document.getElementById("admin-panel");
  if (adminPanel) adminPanel.style.display = "none";
  if (loginScreen) loginScreen.style.display = "flex";
  transactionsLoaded = false;

  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

function esc(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getStatusBadge(status) {
  const map = {
    CREATED: '<span class="badge badge-pending">Criado</span>',
    PIX_PAID: '<span class="badge badge-paid">PIX Pago</span>',
    PENDING_REVIEW: '<span class="badge badge-pending">Em Revisão</span>',
    APPROVED: '<span class="badge badge-paid">Aprovado</span>',
    COMPLETED: '<span class="badge badge-processed">Concluído</span>',
    REJECTED: '<span class="badge badge-unknown">Rejeitado</span>',
  };
  return (
    map[status] || `<span class="badge badge-unknown">${esc(status)}</span>`
  );
}

function getUserStatusBadge(status) {
  const map = {
    PENDING_APPROVAL: '<span class="badge badge-pending">Aguardando</span>',
    APPROVED: '<span class="badge badge-paid">Aprovado</span>',
    REJECTED: '<span class="badge badge-unknown">Rejeitado</span>',
  };
  return (
    map[status] || `<span class="badge badge-unknown">${esc(status)}</span>`
  );
}

function showLoading(show) {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.classList.toggle("visible", show);
  }
  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) {
    refreshBtn.disabled = show;
    refreshBtn.textContent = show ? "Carregando..." : "Atualizar";
  }
}

async function downloadTransactions() {
  try {
    const res = await apiFetch("/api/admin/orders", {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await safeJson(res);
    const blob = new Blob([JSON.stringify(data.orders || [], null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flowpay_orders_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("✅ Download realizado!", "success");
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      showNotification("❌ Erro ao fazer download", "error");
    }
  }
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.style.cssText =
    "position:fixed;bottom:20px;right:20px;padding:12px 18px;border-radius:12px;color:#fff;font-size:.9rem;font-weight:600;z-index:9999;transition:opacity .3s;max-width:320px;";
  const colors = {
    success: "#00aa55",
    error: "#cc2200",
    warning: "#cc7700",
    info: "#0077cc",
  };
  notification.style.background = colors[type] || colors.info;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

window['executeSettlement'] = completeOrder;
window['loadPendingUsers'] = loadPendingUsers;
window['loadSettlementOrders'] = () => loadTransactions(true);
window['viewTransaction'] = function (id) {
  const t = transactions.find(
    (x) => x.charge_id === id || String(x.id) === String(id)
  );
  if (t) alert(JSON.stringify(t, null, 2));
};
