#!/usr/bin/env node
import fs from "fs";
import crypto from "crypto";

const IN = "data/pix_orders.private.json";
const OUT = "public/pix_orders.json";

const src = JSON.parse(fs.readFileSync(IN, "utf8"));

function sha256(s){ return crypto.createHash("sha256").update(s).digest("hex"); }

const out = src.map(e => {
  const created = e.createdAt ?? new Date().toISOString();
  const key = `${e.id}|${e.chargeId||""}|${created}`;
  return {
    id: e.id,
    status: e.status,
    amount: e.valor ?? e.amount,
    currency: e.moeda ?? e.currency ?? "BRL",
    provider: "pix",
    ref_hash: `sha256:${sha256(key)}`,
    createdAt: created,
    updatedAt: e.updatedAt ?? null
  };
});

// ordena desc por createdAt
out.sort((a,b)=> (b.createdAt||"").localeCompare(a.createdAt||""));

fs.writeFileSync(OUT, JSON.stringify(out, null, 2)+"\n");
console.log(`✔ Gerado ${OUT} com ${out.length} registros (redigidos).`);
