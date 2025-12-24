#!/usr/bin/env node
import fs from "fs";
import path from "path";

const BAD_CDNS = /(https?:)?\/\/(unpkg\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)/i;
const BAD_EVAL = /unsafe-eval/;

function fail(msg){ console.error("❌", msg); process.exit(1); }

function scanHTML() {
  const files = walk("public").filter(f => f.endsWith(".html"));
  for (const f of files) {
    const s = fs.readFileSync(f, "utf8");
    if (BAD_CDNS.test(s)) fail(`CDN proibida em ${f} (unpkg/cdnjs/jsdelivr)`);
  }
}

function scanCSP() {
  const toml = fs.existsSync("netlify.toml") ? fs.readFileSync("netlify.toml","utf8") : "";
  
  // Verificar se Web3Auth está ativo no neo.json
  let web3authEnabled = false;
  if (fs.existsSync("neo.json")) {
    try {
      const neoConfig = JSON.parse(fs.readFileSync("neo.json", "utf8"));
      web3authEnabled = neoConfig.custody?.web3auth?.enabled === true;
      console.log("🔍 Web3Auth enabled:", web3authEnabled);
      console.log("🔍 neo.json config:", JSON.stringify(neoConfig.custody?.web3auth, null, 2));
    } catch (e) {
      console.log("❌ Erro ao ler neo.json:", e.message);
    }
  } else {
    console.log("❌ neo.json não encontrado");
  }
  
  // Procurar apenas em linhas que não são comentários
  const lines = toml.split('\n');
  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine.startsWith('#') || cleanLine === '') continue;
    if (BAD_EVAL.test(cleanLine)) {
      if (web3authEnabled) {
        console.log("⚠️  'unsafe-eval' permitido para Web3Auth (WebAssembly)");
        continue;
      }
      fail(`CSP contém 'unsafe-eval' em netlify.toml: ${cleanLine}`);
    }
  }
}

function checkNeo() {
  if (!fs.existsSync("neo.json")) fail("neo.json ausente");
  // valida formato superficial (evita JSON malformado)
  try { JSON.parse(fs.readFileSync("neo.json","utf8")); } catch { fail("neo.json inválido (JSON)"); }
}

function walk(dir){
  let out = [];
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, e.name);
    
    // Ignorar diretórios não relevantes
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '.github') {
        continue;
      }
      out = out.concat(walk(p));
    } else {
      out.push(p);
    }
  }
  return out;
}

scanHTML();
scanCSP();
checkNeo();
console.log("✅ NEØ guard ok");
