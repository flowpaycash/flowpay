export const config = { path: "/.netlify/functions/auth-magic-start" };

import crypto from "node:crypto";

const APP_URL = process.env.APP_URL || "http://localhost:8888";
const MAGIC_SECRET = process.env.MAGIC_SECRET || "dev-secret-change";

function sign(data) {
  return crypto.createHmac("sha256", MAGIC_SECRET).update(data).digest("hex");
}

function b64u(s) {
  return Buffer.from(s).toString("base64url");
}

export default async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body || {};
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return res.status(400).json({ error: "email inválido" });
  }

  const exp = Date.now() + 10 * 60 * 1000;
  const payload = `${email}|${exp}`;
  const sig = sign(payload);
  const url = `${APP_URL}/auth/magic?e=${b64u(email)}&x=${exp}&s=${sig}`;

  console.log("Magic link (dev):", url);

  return res.status(200).json({ sent: true });
};

