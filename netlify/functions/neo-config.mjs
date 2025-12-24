// export const config = { path: "/api/neo-config" };
import fs from "node:fs";
import path from "node:path";

export default async (req, res) => {
  // CORS para desenvolvimento
  if (res.setHeader) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
  }
  
  let neo = {};
  try { 
    const neoPath = path.join(process.cwd(), "neo.json");
    neo = JSON.parse(fs.readFileSync(neoPath, "utf8")); 
  } catch (error) {
    console.warn("Falha ao ler neo.json:", error);
  }
  
  const out = {
    web3auth: {
      enabled: !!neo?.web3auth?.enabled,
      client_id: neo?.web3auth?.client_id || "",
      network: neo?.web3auth?.network || "sapphire_mainnet"
    },
    crypto: {
      rpc: neo?.payment_methods?.crypto?.rpc_endpoints?.[0] || "https://rpc.ankr.com/eth",
      chainId: neo?.payment_methods?.crypto?.supported_chains?.[0]?.chainId || "0x1"
    }
  };
  
  // Sempre atual (sem cache)
  if (res.setHeader) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
  }
  
  return res.json(out);
};
