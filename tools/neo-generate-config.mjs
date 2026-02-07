#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Manually load .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(envPath)) {
  try {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !key.startsWith('#')) {
        process.env[key.trim()] = value.trim();
      }
    });
  } catch (e) {
    console.warn("⚠️ Could not read .env file (EPERM/ENOENT). Relying on system env vars.");
  }
}

function resolveRef(ref) {
  if (typeof ref === 'string' && ref.startsWith('ENV:')) {
    const envVar = ref.replace('ENV:', '');
    return process.env[envVar] || "";
  }
  return ref || "";
}

try {
  const neo = JSON.parse(fs.readFileSync("neo.json", "utf8"));

  const out = {
    web3auth: {
      client_id: resolveRef(neo?.custody?.web3auth?.client_id_ref),
      network: neo?.custody?.web3auth?.network || "sapphire_mainnet"
    },
    crypto: {
      rpc: "https://rpc.ankr.com/eth", // Default fallback
      chainId: "0x1"
    },
    infura: {
      apiKey: process.env.INFURA_API_KEY || process.env.INFURA_KEY || ""
    }
  };

  // Try to extract crypto chains if available
  if (neo?.payments?.providers?.crypto?.chains) {
    const ethChain = neo.payments.providers.crypto.chains.find(c => c.chain_id === 1);
    if (ethChain) {
      // Resolve usage of ${INFURA_KEY} if present
      let rpc = ethChain.rpc[0];
      if (rpc.includes('${INFURA_KEY}')) {
        rpc = rpc.replace('${INFURA_KEY}', process.env.INFURA_KEY || '');
      }
      out.crypto.rpc = rpc;
      out.crypto.chainId = "0x" + ethChain.chain_id.toString(16);
    }
  }

  const js = `window.NEO_CONFIG = ${JSON.stringify(out, null, 2)};\n`;
  fs.mkdirSync("public/assets", { recursive: true });
  fs.writeFileSync("public/assets/neo.config.js", js);
  console.log("✔ gerado public/assets/neo.config.js com sucesso");
  console.log(`  - Web3Auth Client ID: ${out.web3auth.client_id ? 'Configured' : 'MISSING'}`);

} catch (e) {
  console.error("❌ Erro ao gerar config:", e.message);
  process.exit(1);
}
