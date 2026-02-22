import tls from "node:tls";
import { secureLog } from "./config.mjs";

const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_DOMAINS_URL = "https://api.resend.com/domains";
const DEFAULT_FROM = "FlowPay <noreply@flowpay.cash>";
const DOMAIN_CHECK_TTL_MS = Number(
  process.env.EMAIL_DOMAIN_CHECK_TTL_MS || 10 * 60 * 1000
);
const VERIFIED_DOMAIN_STATES = new Set(["verified", "valid", "active"]);

const domainStatusCache = new Map();
let startupValidationExecuted = false;

/**
 * Envia um e-mail usando a API do Resend.
 * @param {object} options - Opções do e-mail
 * @param {string} options.to - Destinatário
 * @param {string} options.subject - Assunto
 * @param {string} options.html - Conteúdo HTML do e-mail
 * @param {string} [options.from] - Remetente (opcional, usa default)
 */
export async function sendEmail({ to, subject, html, from }) {
  const apiKey = process.env.RESEND_API_KEY;
  const defaultFrom = process.env.SMTP_FROM || DEFAULT_FROM;
  const recipients = normalizeRecipients(to);
  const fromCandidates = buildFromCandidates(from || defaultFrom);
  const attempts = [];

  if (!recipients.length || !subject || !html) {
    return {
      success: false,
      error: "Invalid email payload",
    };
  }

  if (apiKey) {
    triggerStartupDomainValidation(apiKey, fromCandidates[0]);

    for (const candidateFrom of fromCandidates) {
      const preflight = await validateDomainBeforeSend(apiKey, candidateFrom);
      if (preflight.blocked) {
        attempts.push({
          provider: "resend-preflight",
          from: candidateFrom,
          status: preflight.status,
          reason: preflight.reason,
        });
        continue;
      }

      const resendResult = await sendViaResend({
        apiKey,
        from: candidateFrom,
        to: recipients,
        subject,
        html,
      });

      if (resendResult.success) {
        secureLog("info", "E-mail enviado via Resend com sucesso", {
          to: recipients,
          subject,
          from: candidateFrom,
          id: resendResult.id,
        });
        return resendResult;
      }

      attempts.push({
        provider: "resend",
        from: candidateFrom,
        statusCode: resendResult.statusCode,
        error: resendResult.error,
      });

      if (
        !isUnverifiedDomainError(resendResult.error, resendResult.statusCode)
      ) {
        break;
      }
    }
  } else {
    secureLog(
      "warn",
      "Tentativa de envio de e-mail sem RESEND_API_KEY configurada."
    );
  }

  if (hasSmtpFallbackConfig()) {
    const smtpFrom = fromCandidates[fromCandidates.length - 1] || defaultFrom;
    const smtpResult = await sendViaSmtp({
      from: smtpFrom,
      to: recipients,
      subject,
      html,
    });

    if (smtpResult.success) {
      secureLog("info", "E-mail enviado via SMTP fallback com sucesso", {
        to: recipients,
        subject,
        from: smtpFrom,
      });
      return smtpResult;
    }

    attempts.push({
      provider: "smtp",
      from: smtpFrom,
      error: smtpResult.error,
    });
  }

  secureLog("error", "Falha ao enviar e-mail após tentativas de failover", {
    to: recipients,
    subject,
    attempts,
  });

  return {
    success: false,
    error: attempts[attempts.length - 1]?.error || "Email delivery failed",
    attempts,
  };
}

function normalizeRecipients(to) {
  if (!to) return [];
  if (Array.isArray(to)) {
    return to.map((recipient) => String(recipient).trim()).filter(Boolean);
  }
  return [String(to).trim()].filter(Boolean);
}

function buildFromCandidates(primaryFrom) {
  const candidates = [];

  const pushCandidate = (value) => {
    if (!value) return;
    if (!candidates.includes(value)) {
      candidates.push(value);
    }
  };

  pushCandidate(primaryFrom);
  pushCandidate(process.env.RESEND_FALLBACK_FROM);

  const parsed = parseFromAddress(primaryFrom);
  if (parsed?.domain?.startsWith("send.")) {
    const rootDomain = parsed.domain.replace(/^send\./, "");
    pushCandidate(
      formatFromHeader(parsed.name, `${parsed.local}@${rootDomain}`)
    );
  }

  return candidates.length ? candidates : [DEFAULT_FROM];
}

function parseFromAddress(fromHeader) {
  const raw = String(fromHeader || "").trim();
  if (!raw) return null;

  const angled = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  const email = angled ? angled[2] : raw.replace(/^"|"$/g, "");
  const [local, domain] = email.split("@");

  if (!local || !domain) return null;

  return {
    name: angled ? angled[1].replace(/^"|"$/g, "").trim() : "",
    email,
    local,
    domain: domain.toLowerCase(),
  };
}

function formatFromHeader(name, email) {
  const normalizedName = String(name || "").trim();
  return normalizedName ? `${normalizedName} <${email}>` : email;
}

function hasSmtpFallbackConfig() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

async function sendViaResend({ apiKey, from, to, subject, html }) {
  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    const data = await safeReadJson(response);
    if (response.ok) {
      return {
        success: true,
        id: data?.id,
        provider: "resend",
      };
    }

    return {
      success: false,
      statusCode: response.status,
      error: data || { message: `Resend error ${response.status}` },
      provider: "resend",
    };
  } catch (error) {
    return {
      success: false,
      error: { message: error.message },
      provider: "resend",
    };
  }
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isUnverifiedDomainError(error, statusCode) {
  if (statusCode !== 403) return false;
  const message = String(error?.message || "").toLowerCase();
  return message.includes("domain is not verified");
}

async function validateDomainBeforeSend(apiKey, fromHeader) {
  const from = parseFromAddress(fromHeader);
  if (!from?.domain) {
    return {
      blocked: false,
      status: "unknown",
      reason: "invalid-from-header",
    };
  }

  const cacheKey = from.domain;
  const cached = domainStatusCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.checkedAt < DOMAIN_CHECK_TTL_MS) {
    const blocked =
      cached.status === "unverified" || cached.status === "missing";
    return { blocked, status: cached.status, reason: cached.reason };
  }

  try {
    const response = await fetch(RESEND_DOMAINS_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const payload = await safeReadJson(response);
    if (!response.ok) {
      const result = {
        status: "unknown",
        reason: `domains-api-${response.status}`,
        checkedAt: now,
      };
      domainStatusCache.set(cacheKey, result);
      return { blocked: false, status: result.status, reason: result.reason };
    }

    const domains = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];

    const match = domains.find((domainEntry) => {
      const candidate = String(domainEntry?.name || "").toLowerCase();
      return from.domain === candidate || from.domain.endsWith(`.${candidate}`);
    });

    if (!match) {
      const result = {
        status: "missing",
        reason: "domain-not-found-in-resend",
        checkedAt: now,
      };
      domainStatusCache.set(cacheKey, result);
      return { blocked: true, status: result.status, reason: result.reason };
    }

    const status = String(match.status || "").toLowerCase();
    const isVerified = VERIFIED_DOMAIN_STATES.has(status);
    const result = {
      status: isVerified ? "verified" : "unverified",
      reason: isVerified
        ? "domain-verified"
        : `domain-status-${status || "unknown"}`,
      checkedAt: now,
    };

    domainStatusCache.set(cacheKey, result);
    return {
      blocked: !isVerified,
      status: result.status,
      reason: result.reason,
    };
  } catch (error) {
    const result = {
      status: "unknown",
      reason: `domains-api-error:${error.message}`,
      checkedAt: now,
    };
    domainStatusCache.set(cacheKey, result);
    return { blocked: false, status: result.status, reason: result.reason };
  }
}

function triggerStartupDomainValidation(apiKey, fromHeader) {
  if (startupValidationExecuted || process.env.NODE_ENV === "test") return;
  startupValidationExecuted = true;

  void validateDomainBeforeSend(apiKey, fromHeader)
    .then((result) => {
      if (result.blocked) {
        secureLog(
          "error",
          "Email startup check: remetente não verificado no Resend",
          {
            from: fromHeader,
            status: result.status,
            reason: result.reason,
          }
        );
      } else {
        secureLog("info", "Email startup check concluído", {
          from: fromHeader,
          status: result.status,
        });
      }
    })
    .catch((error) => {
      secureLog("warn", "Email startup check falhou", { error: error.message });
    });
}

async function sendViaSmtp({ from, to, subject, html }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const timeoutMs = Number(process.env.SMTP_TIMEOUT_MS || 12000);

  if (!host || !user || !pass) {
    return { success: false, error: "SMTP fallback is not configured" };
  }

  const fromAddress = parseFromAddress(from)?.email || from;
  if (!fromAddress || !String(fromAddress).includes("@")) {
    return { success: false, error: "Invalid SMTP sender address" };
  }

  const message = buildMimeMessage({ from, to, subject, html });

  let socket;
  try {
    socket = await openSmtpSocket({ host, port, timeoutMs });
    const reader = createSmtpReader(socket);

    await expectSmtpResponse(reader, [220], timeoutMs);
    await smtpCommand(
      socket,
      reader,
      `EHLO ${resolveEhloDomain()}`,
      [250],
      timeoutMs
    );

    const auth = Buffer.from(`\u0000${user}\u0000${pass}`).toString("base64");
    await smtpCommand(socket, reader, `AUTH PLAIN ${auth}`, [235], timeoutMs);

    await smtpCommand(
      socket,
      reader,
      `MAIL FROM:<${fromAddress}>`,
      [250],
      timeoutMs
    );
    for (const recipient of to) {
      await smtpCommand(
        socket,
        reader,
        `RCPT TO:<${recipient}>`,
        [250, 251],
        timeoutMs
      );
    }

    await smtpCommand(socket, reader, "DATA", [354], timeoutMs);
    socket.write(`${message}\r\n.\r\n`);
    await expectSmtpResponse(reader, [250], timeoutMs);
    socket.write("QUIT\r\n");
    socket.end();

    return { success: true, provider: "smtp" };
  } catch (error) {
    if (socket && !socket.destroyed) {
      socket.destroy();
    }
    return { success: false, error: error.message };
  }
}

function openSmtpSocket({ host, port, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
    });

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onSecureConnect = () => {
      cleanup();
      resolve(socket);
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("error", onError);
      socket.off("secureConnect", onSecureConnect);
    };

    const timer = setTimeout(() => {
      cleanup();
      socket.destroy();
      reject(new Error("SMTP connection timeout"));
    }, timeoutMs);

    socket.on("error", onError);
    socket.on("secureConnect", onSecureConnect);
  });
}

function createSmtpReader(socket) {
  const queue = [];
  let waiting = null;
  let buffer = "";
  let current = null;

  const pushResponse = (response) => {
    if (waiting) {
      const resolver = waiting;
      waiting = null;
      resolver.resolve(response);
      return;
    }
    queue.push(response);
  };

  const handleLine = (line) => {
    if (!line) return;

    const code = Number(line.slice(0, 3));
    if (!Number.isInteger(code)) return;

    if (!current) {
      current = { code, lines: [line] };
    } else {
      current.lines.push(line);
    }

    if (line[3] === " ") {
      const done = { code, lines: current.lines.slice() };
      current = null;
      pushResponse(done);
    }
  };

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    while (buffer.includes("\n")) {
      const index = buffer.indexOf("\n");
      const line = buffer.slice(0, index).replace(/\r$/, "");
      buffer = buffer.slice(index + 1);
      handleLine(line);
    }
  });

  const next = (timeoutMs) => {
    if (queue.length > 0) {
      return Promise.resolve(queue.shift());
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (waiting) waiting = null;
        reject(new Error("SMTP response timeout"));
      }, timeoutMs);

      waiting = {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
    });
  };

  socket.on("error", (error) => {
    if (waiting) {
      const resolver = waiting;
      waiting = null;
      resolver.reject(error);
    }
  });

  socket.on("close", () => {
    if (waiting) {
      const resolver = waiting;
      waiting = null;
      resolver.reject(new Error("SMTP socket closed"));
    }
  });

  return { next };
}

async function smtpCommand(socket, reader, command, expectedCodes, timeoutMs) {
  socket.write(`${command}\r\n`);
  return expectSmtpResponse(reader, expectedCodes, timeoutMs, command);
}

async function expectSmtpResponse(
  reader,
  expectedCodes,
  timeoutMs,
  command = ""
) {
  const response = await reader.next(timeoutMs);
  if (!expectedCodes.includes(response.code)) {
    const suffix = command ? ` for "${command}"` : "";
    throw new Error(
      `SMTP unexpected response ${response.code}${suffix}: ${response.lines.join(" | ")}`
    );
  }
  return response;
}

function buildMimeMessage({ from, to, subject, html }) {
  const safeSubject = encodeMimeWord(String(subject || ""));
  const safeHtml = dotStuff(String(html || "").replace(/\r?\n/g, "\r\n"));
  const headers = [
    `From: ${from}`,
    `To: ${to.join(", ")}`,
    `Subject: ${safeSubject}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
  ];

  return `${headers.join("\r\n")}\r\n\r\n${safeHtml}`;
}

function encodeMimeWord(value) {
  if (!value) return "";
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function dotStuff(content) {
  return content.replace(/(^|\r\n)\./g, "$1..");
}

function resolveEhloDomain() {
  try {
    const appUrl = process.env.URL || "https://flowpay.cash";
    return new URL(appUrl).hostname || "flowpay.local";
  } catch {
    return "flowpay.local";
  }
}
