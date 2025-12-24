import fs from "fs";

const [,, draftPath, officialPath] = process.argv;
if (!draftPath || !officialPath) {
  console.error("uso: node tools/neo-diff.mjs .cursor/neo.json neo.json");
  process.exit(1);
}

const load = p => JSON.parse(fs.readFileSync(p, "utf8"));

const isSecretKey = key => /secret|token|password|api[_-]?key|client[_-]?id/i.test(key);
const shouldIgnorePath = p => isSecretKey(p);

function collectStrings(obj, base="$", out=new Map()) {
  if (obj === null || obj === undefined) return out;
  if (typeof obj === "string") {
    out.set(base, obj);
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v,i) => collectStrings(v, `${base}[${i}]`, out));
    return out;
  }
  if (typeof obj === "object") {
    for (const [k,v] of Object.entries(obj)) {
      const next = `${base}.${k}`;
      collectStrings(v, next, out);
    }
  }
  return out;
}

function main() {
  const draft = load(draftPath);
  const official = load(officialPath);

  const d = collectStrings(draft);
  const o = collectStrings(official);

  // agregamos todos os paths
  const paths = new Set([...d.keys(), ...o.keys()]);

  const changes = [];
  const added = [];
  const removed = [];

  for (const p of paths) {
    if (shouldIgnorePath(p)) continue; // ignora possíveis segredos
    const dv = d.get(p);
    const ov = o.get(p);
    if (dv === undefined && ov !== undefined) removed.push({path:p, old:ov});
    else if (dv !== undefined && ov === undefined) added.push({path:p, new:dv});
    else if (dv !== ov) changes.push({path:p, old:ov, new:dv});
  }

  let md = [];
  md.push(`# neo-diff (textos)`);
  md.push(`- draft: \`${draftPath}\``);
  md.push(`- official: \`${officialPath}\``);
  md.push("");

  if (!changes.length && !added.length && !removed.length) {
    md.push("> ✅ Sem diferenças textuais.");
    console.log(md.join("\n"));
    return;
  }

  if (changes.length) {
    md.push("## ✏️ Alterações (mesmos paths, texto mudou)");
    for (const {path, old, new: nv} of changes) {
      md.push(`\n### ${path}`);
      md.push(`**ANTES:**\n`);
      md.push("```");
      md.push((old ?? "").toString());
      md.push("```");
      md.push(`**DEPOIS:**\n`);
      md.push("```");
      md.push((nv ?? "").toString());
      md.push("```");
    }
  }

  if (added.length) {
    md.push("\n## ➕ Adicionados (existem no draft, não existem no oficial)");
    for (const {path, new: nv} of added) {
      md.push(`\n### ${path}`);
      md.push("```");
      md.push((nv ?? "").toString());
      md.push("```");
    }
  }

  if (removed.length) {
    md.push("\n## ➖ Removidos (existem no oficial, não existem no draft)");
    for (const {path, old} of removed) {
      md.push(`\n### ${path}`);
      md.push("```");
      md.push((old ?? "").toString());
      md.push("```");
    }
  }

  console.log(md.join("\n"));
}

main();
