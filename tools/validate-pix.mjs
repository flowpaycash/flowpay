#!/usr/bin/env node
import fs from "fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const schema = JSON.parse(fs.readFileSync("schemas/pix_orders.public.schema.json","utf8"));
const data   = JSON.parse(fs.readFileSync("public/pix_orders.json","utf8"));

const validate = ajv.compile(schema);

if (!validate(data)) {
  console.error("❌ Schema inválido:");
  for (const err of validate.errors) {
    console.error(`- ${err.instancePath || "<root>"} ${err.message}`);
  }
  process.exit(1);
}

console.log("✅ Schema válido.");
