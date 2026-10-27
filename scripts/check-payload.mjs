#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Fail if catalogue prose reaches the browser.
//
// The index ships CarSummary objects -- slug, maker, model, years, power -- and
// deliberately not the blurbs, which are long, numerous, and useless to a list
// of rows. The failure this catches is a quiet one: a client component imports
// a VALUE from the catalogue barrel, the bundler follows it to CARS, and every
// blurb lands in a JS chunk. Nothing breaks. The page looks identical. The
// served HTML is clean, which is what made the first attempt at this look like
// it had worked when it had not.
//
// So the check reads the built CLIENT chunks, which is where the evidence is.
// Run it after `npm run build`.
// ---------------------------------------------------------------------------
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { CARS } from "../src/catalog/index.ts";

const ROOT = ".next/static/chunks";

function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (p.endsWith(".js")) out.push(p);
  }
  return out;
}

let files;
try {
  files = walk(ROOT);
} catch {
  console.error(`No build found at ${ROOT}. Run \`npm run build\` first.`);
  process.exit(2);
}

// A distinctive opening fragment of each blurb: long enough not to collide
// with ordinary code, short enough to survive minification of the string.
const probes = CARS.map((c) => ({ slug: c.slug, text: c.blurb.slice(0, 40) }));
const leaks = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const hits = probes.filter((p) => source.includes(p.text));
  if (hits.length) leaks.push({ file, hits });
}

if (leaks.length === 0) {
  console.log(`clean: no blurb from ${CARS.length} cars appears in ${files.length} client chunks`);
  process.exit(0);
}

console.error("Catalogue prose is being shipped to the browser.\n");
for (const { file, hits } of leaks) {
  const kb = (statSync(file).size / 1024).toFixed(1);
  console.error(`  ${file}  (${kb} kB)  carries ${hits.length} blurbs, e.g. ${hits[0].slug}`);
}
console.error(
  "\nA client component is importing a value from the catalogue barrel." +
    "\nImport types from src/catalog/types, and keep value imports in server components.",
);
process.exit(1);
