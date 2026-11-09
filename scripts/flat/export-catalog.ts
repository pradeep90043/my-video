import fs from "fs";
import { FLAT_CATALOG } from "../../src/flat/spec";

/** Writes the FLAT-VECTOR parts catalog for the server's planner: npx tsx scripts/flat/export-catalog.ts <out.json> */
const out = process.argv[2] ?? "flatCatalog.json";
fs.writeFileSync(out, JSON.stringify(FLAT_CATALOG, null, 1) + "\n");
console.log(`✓ ${out}`);
