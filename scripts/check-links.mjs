#!/usr/bin/env node
/**
 * Check every link the catalogue carries.
 *
 * WHY THIS EXISTS. The catalogue's whole claim is that every figure came from
 * somewhere a reader can go and look. A url that 404s is worse than no url,
 * because it looks like a citation and isn't one — so any link added to a
 * source has to be checked, and checked again later, because manufacturer
 * pages move constantly.
 *
 * This could not be run where the catalogue was written: that container's
 * egress policy refuses CONNECT to every car manufacturer's domain, so no url
 * could be verified and almost none were added. Run this somewhere with open
 * network access before trusting a link, and after any batch of new cars.
 *
 *   node scripts/check-links.mjs           check brand sites and source urls
 *   node scripts/check-links.mjs --brands  brand sites only
 *
 * Exits non-zero if anything is unreachable, so it can gate a deploy.
 */
import { BRANDS } from "../src/catalog/brands.ts";
import { CARS } from "../src/catalog/index.ts";

const TIMEOUT_MS = 15000;
const onlyBrands = process.argv.includes("--brands");

async function check(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    // HEAD first: cheaper, and most sites answer it. Some reject HEAD with 405
    // and are perfectly fine on GET, so fall through rather than report a
    // working page as broken.
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctl.signal });
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await fetch(url, { method: "GET", redirect: "follow", signal: ctl.signal });
    }
    return { ok: res.ok, status: res.status, final: res.url };
  } catch (err) {
    return { ok: false, status: 0, error: err.name === "AbortError" ? "timed out" : String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

const targets = [];
for (const b of BRANDS) targets.push({ what: `brand ${b.slug}`, url: b.site });
if (!onlyBrands) {
  for (const car of CARS) {
    for (const s of car.sources) {
      if (s.url) targets.push({ what: `${car.slug} — ${s.publisher}`, url: s.url });
    }
  }
}

console.log(`Checking ${targets.length} links\n`);
let bad = 0;
for (const t of targets) {
  const r = await check(t.url);
  const moved = r.ok && r.final && r.final.replace(/\/$/, "") !== t.url.replace(/\/$/, "");
  if (!r.ok) bad++;
  const mark = r.ok ? (moved ? "moved" : "ok   ") : "BROKEN";
  console.log(
    `  ${mark}  ${String(r.status).padStart(3)}  ${t.what}\n         ${t.url}` +
      (moved ? `\n         now: ${r.final}` : "") +
      (r.error ? `\n         ${r.error}` : ""),
  );
}

const withUrl = CARS.reduce((n, c) => n + c.sources.filter((s) => s.url).length, 0);
console.log(
  `\n${targets.length - bad} reachable, ${bad} broken.` +
    `\n${withUrl} of ${CARS.reduce((n, c) => n + c.sources.length, 0)} sources carry a url.`,
);
process.exit(bad === 0 ? 0 : 1);
