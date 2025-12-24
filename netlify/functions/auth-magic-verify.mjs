export const config = { path: "/.netlify/functions/auth-magic-verify" };

import crypto from "node:crypto";

const MAGIC_SECRET = process.env.MAGIC_SECRET || "dev-secret-change";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-change";

function sign(data, key = MAGIC_SECRET) {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

function fromB64u(s) {
  return Buffer.from(s || "", "base64url").toString();
}

export default async (req, res) => {
  const { e, x, s } = req.query || {};
  const email = fromB64u(e);
  const exp = Number(x);

  if (!email || !exp || !s) return res.status(400).end("Bad request");
  if (Date.now() > exp) return res.status(401).end("Link expirado");

  const expected = sign(`${email}|${exp}`);
  if (expected !== s) return res.status(401).end("Assinatura inválida");

  const sessionPayload = `${email}|${Date.now()}`;
  const sessionSig = sign(sessionPayload, SESSION_SECRET);
  const cookie = `sid=${Buffer.from(sessionPayload).toString("base64url")}.${sessionSig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;

  res.setHeader("Set-Cookie", cookie);
  return res.redirect(302, "/client");
};

