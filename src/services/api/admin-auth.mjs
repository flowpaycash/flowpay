import crypto from "crypto";
import { secureLog } from "./config.mjs";

export const ADMIN_SESSION_COOKIE = "flowpay_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8h

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.TOKEN_SECRET ||
    process.env.FLOWPAY_JWT_SECRET ||
    null
  );
}

export function isAdminPasswordConfigured() {
  return (
    typeof process.env.ADMIN_PASSWORD === "string" &&
    process.env.ADMIN_PASSWORD.length > 0
  );
}

export function verifyAdminPassword(passwordAttempt) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (
    typeof adminPassword !== "string" ||
    adminPassword.length === 0 ||
    typeof passwordAttempt !== "string"
  ) {
    return false;
  }

  const expected = Buffer.from(adminPassword, "utf8");
  const provided = Buffer.from(passwordAttempt, "utf8");

  if (expected.length !== provided.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, provided);
}

function signToken(payload) {
  const secret = getSessionSecret();
  if (!secret) return null;

  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

function verifyToken(token) {
  const secret = getSessionSecret();
  if (!secret || typeof token !== "string" || !token.includes(".")) return null;

  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  const expectedBuf = Buffer.from(expectedSignature, "utf8");
  const providedBuf = Buffer.from(signature, "utf8");

  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (!payload || payload.role !== "admin") return null;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp)
      return null;
    return payload;
  } catch {
    return null;
  }
}

export function createAdminSessionToken({ clientIp, userAgent } = {}) {
  const now = Date.now();
  return signToken({
    role: "admin",
    iat: now,
    exp: now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
    ip: clientIp || "unknown",
    ua: userAgent || "unknown",
  });
}

export function setAdminSessionCookie(cookies, token) {
  cookies.set(ADMIN_SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearAdminSessionCookie(cookies) {
  cookies.set(ADMIN_SESSION_COOKIE, "", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
  });
}

export function getAdminSession(cookies) {
  const token = cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyToken(token);
}

export function requireAdminSession(cookies) {
  return Boolean(getAdminSession(cookies));
}

export function withAdminNoStoreHeaders(headers = {}) {
  return {
    ...headers,
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

export function logAdminConfigIssue() {
  secureLog("error", "Admin auth misconfigured: missing ADMIN_PASSWORD");
}
