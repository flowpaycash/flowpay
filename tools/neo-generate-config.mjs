#!/usr/bin/env node
import fs from "fs";

const neo = JSON.parse(fs.readFileSync("neo.json","utf8"));
const out = {
  web3auth: {
    client_id: neo?.web3auth?.client_id || "",
    network: neo?.web3auth?.network || "sapphire_mainnet"
  },
  crypto: {
    rpc: neo?.payment_methods?.crypto?.rpc_endpoints?.[0] || "https://rpc.ankr.com/eth",
    chainId: (neo?.payment_methods?.crypto?.supported_chains?.[0]?.chainId) || "0x1"
  }
};

const js = `window.NEO_CONFIG = ${JSON.stringify(out,null,2)};\n`;
fs.mkdirSync("public/assets", { recursive:true });
fs.writeFileSync("public/assets/neo.config.js", js);
console.log("✔ gerado public/assets/neo.config.js");
