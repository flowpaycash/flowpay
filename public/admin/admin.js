// FLOWPay - Admin Panel JavaScript
// Painel administrativo para gerenciar transações e usuários

const SESSION_KEY = "flowpay_admin_session";
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas

let transactions = [];
let settlementOrders = [];
let pendingUsers = [];
let isAuthenticated = false;
let adminToken = null;

// ────────────────────────────────────────
// INIT
// ────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {
  initializeElements();
  checkAuthentication();
  setupEventListeners();

  if (isAuthenticated) {
    showAdminPanel();
    loadAll();
  }
});

function initializeElements() {
  // These are resolved on demand via getElementById where needed
}

function setupEventListeners() {
  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) refreshBtn.addEventListener("click", loadAll);

  const downloadBtn = document.getElementById("download-btn");
  if (downloadBtn) downloadBtn.addEventListener("click", downloadTransactions);

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

  const statusFilter = document.getElementById("status-filter");
  if (statusFilter) statusFilter.addEventListener("change", renderTransactions);

  const moedaFilter = document.getElementById("moeda-filter");
  if (moedaFilter) moedaFilter.addEventListener("change", renderTransactions);
}

// ────────────────────────────────────────
// AUTH
// ────────────────────────────────────────

function checkAuthentication() {
  const session = localStorage.getItem(SESSION_KEY);
  if (session) {
    try {
      const sessionData = JSON.parse(session);
      if (Date.now() - sessionData.timestamp < SESSION_DURATION) {
        isAuthenticated = true;
        adminToken = sessionData.token;
        return;
      }
    } catch (_) {}
    localStorage.removeItem(SESSION_KEY);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const password = document.getElementById("password").value;

  // Validate against the backend
  try {
    const res = await fetch("/api/admin/metrics", {
      headers: { Authorization: `Bearer ${password}` },
    });

    if (res.ok) {
      isAuthenticated = true;
      adminToken = password;
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          token: password,
        })
      );
      showAdminPanel();
      loadAll();
      showNotification("✅ Login realizado com sucesso!", "success");
    } else {
      showNotification("❌ Senha incorreta!", "error");
    }
  } catch (_) {
    showNotification("❌ Erro de conexão. Tente novamente.", "error");
  }
}

function handleLogout() {
  isAuthenticated = false;
  adminToken = null;
  localStorage.removeItem(SESSION_KEY);
  document.getElementById("admin-panel").style.display = "none";
  document.getElementById("login-screen").style.display = "flex";
  showNotification("👋 Logout realizado.", "info");
}

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json",
  };
}

// ────────────────────────────────────────
// LOAD ALL
// ────────────────────────────────────────

function loadAll() {
  loadTransactions();
  loadPendingUsers();
  loadMetrics();
}

// ────────────────────────────────────────
// METRICS
// ────────────────────────────────────────

async function loadMetrics() {
  try {
    const res = await fetch("/api/admin/metrics", {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && data.metrics) {
      const m = data.metrics;
      setEl("pending-count", m.payments_24h ?? 0);
      setEl("paid-count", m.payments_24h ?? 0);
      setEl("processed-count", m.total_wallets ?? 0);
      setEl("total-value", `R$ ${Number(m.volume_24h || 0).toFixed(2)}`);
    }
  } catch (_) {}
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ────────────────────────────────────────
// TRANSACTIONS
// ────────────────────────────────────────

async function loadTransactions() {
  try {
    showLoading(true);
    const res = await fetch("/api/admin/orders", { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    transactions = data.orders || [];
    updateStatistics();
    renderTransactions();
    showNotification(
      `✅ ${transactions.length} transações carregadas`,
      "success"
    );
  } catch (error) {
    showNotification("❌ Erro ao carregar transações", "error");
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
  if (moedaFilter)
    filtered = filtered.filter(
      (t) => (t.metadata || "").includes(moedaFilter) || moedaFilter === "BRL"
    );

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
      row.querySelector(".btn-complete").addEventListener("click", (ev) => {
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
    const res = await fetch("/api/admin/orders", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "complete", chargeId }),
    });
    const data = await res.json();
    if (data.success) {
      showNotification("✅ Pedido concluído!", "success");
      loadTransactions();
    } else {
      showNotification(`❌ ${data.error}`, "error");
    }
  } catch (_) {
    showNotification("❌ Erro ao concluir pedido", "error");
  } finally {
    showLoading(false);
  }
}

window.loadSettlementOrders = loadTransactions; // backward compat alias

// ────────────────────────────────────────
// PENDING USERS
// ────────────────────────────────────────

async function loadPendingUsers() {
  try {
    const res = await fetch("/api/admin/users?status=PENDING_APPROVAL", {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    pendingUsers = data.users || [];
    renderPendingUsers();
  } catch (_) {}
}

function renderPendingUsers() {
  const container = document.getElementById("settlement-orders-container");
  if (!container) return;

  if (pendingUsers.length === 0) {
    container.innerHTML =
      '<p class="no-orders">Nenhum cadastro aguardando aprovacao</p>';
    return;
  }

  container.innerHTML = pendingUsers
    .map(
      (u) => `
        <div class="user-card">
            <div class="user-card-header">
                <span class="user-card-id">#${esc(String(u.id))} — ${esc(u.name)}</span>
                <span class="badge badge-pending">Aguardando</span>
            </div>
            <div class="user-detail-row"><span class="lbl">E-mail</span><span class="val">${esc(u.email)}</span></div>
            <div class="user-detail-row"><span class="lbl">Tipo</span><span class="val">${esc(u.business_type || "—")}</span></div>
            <div class="user-detail-row"><span class="lbl">CPF</span><span class="val">${u.cpf ? esc(u.cpf) : "—"}</span></div>
            <div class="user-detail-row"><span class="lbl">Cadastrado em</span><span class="val">${new Date(u.created_at).toLocaleString("pt-BR")}</span></div>
            <div class="user-card-actions">
                <button class="btn btn-success btn-sm btn-approve" data-user-id="${u.id}">Aprovar</button>
                <button class="btn btn-danger btn-sm btn-reject" data-user-id="${u.id}">Rejeitar</button>
            </div>
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
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, userId: parseInt(userId), reason }),
    });
    const data = await res.json();
    if (data.success) {
      showNotification(
        `✅ Usuário ${label === "aprovar" ? "aprovado" : "rejeitado"}!`,
        "success"
      );
      loadPendingUsers();
    } else {
      showNotification(`❌ ${data.error}`, "error");
    }
  } catch (_) {
    showNotification(`❌ Erro ao ${label} usuário`, "error");
  }
}

// ────────────────────────────────────────
// UI HELPERS
// ────────────────────────────────────────

function showAdminPanel() {
  const loginScreen = document.getElementById("login-screen");
  const adminPanel = document.getElementById("admin-panel");
  if (loginScreen) loginScreen.style.display = "none";
  if (adminPanel) adminPanel.style.display = "flex";

  // Start auto refresh every 30s
  setInterval(() => {
    if (isAuthenticated) loadAll();
  }, 30000);
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
    PENDING_REVIEW: '<span class="badge badge-pending">Em Revisao</span>',
    APPROVED: '<span class="badge badge-paid">Aprovado</span>',
    COMPLETED: '<span class="badge badge-processed">Concluido</span>',
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
    const res = await fetch("/api/admin/orders", { headers: getAuthHeaders() });
    const data = await res.json();
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
  } catch (_) {
    showNotification("❌ Erro ao fazer download", "error");
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

// Global for settlement-orders compat
window.executeSettlement = completeOrder;
window.viewTransaction = function (id) {
  const t = transactions.find(
    (x) => x.charge_id === id || String(x.id) === String(id)
  );
  if (t) alert(JSON.stringify(t, null, 2));
};
