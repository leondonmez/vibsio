/**
 * POST-BUILD HOOK — sitemap.xml + robots.txt integrity validation.
 * Confirms every sitemap <loc> is an absolute https://vibs.io address,
 * that each URL has a matching pre-rendered file in dist/, and that
 * robots.txt advertises the sitemap — Search Console-ready or the
 * pipeline fails.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const SITE = "https://vibs.io";
const errors = [];

/* sitemap.xml */
let sitemap = "";
try {
  sitemap = readFileSync(join(DIST, "sitemap.xml"), "utf8");
} catch {
  errors.push("dist/sitemap.xml is missing from the build output");
}

const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (sitemap && locs.length === 0) errors.push("sitemap.xml contains zero <loc> entries");
if (sitemap && !sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
  errors.push("sitemap.xml is missing the sitemaps.org namespace declaration");
}

for (const loc of locs) {
  if (!loc.startsWith(`${SITE}/`) && loc !== `${SITE}/`) {
    errors.push(`sitemap <loc> is not an absolute secure ${SITE} address: ${loc}`);
    continue;
  }
  const path = loc.slice(SITE.length).replace(/\/$/, "");
  const candidates = [join(DIST, path, "index.html"), join(DIST, `${path}.html`), join(DIST, "index.html")];
  const exists = path === "" ? existsSync(join(DIST, "index.html")) : candidates.slice(0, 2).some(existsSync);
  if (!exists) errors.push(`sitemap lists ${loc} but no pre-rendered file exists in dist/`);
}

/* robots.txt */
let robots = "";
try {
  robots = readFileSync(join(DIST, "robots.txt"), "utf8");
} catch {
  errors.push("dist/robots.txt is missing from the build output");
}
if (robots && !/^Sitemap:\s*https:\/\/vibs\.io\/sitemap\.xml\s*$/m.test(robots)) {
  errors.push("robots.txt does not advertise 'Sitemap: https://vibs.io/sitemap.xml'");
}
if (robots && !/^User-agent:\s*\*/m.test(robots)) {
  errors.push("robots.txt is missing the 'User-agent: *' directive");
}

if (errors.length > 0) {
  console.error("\n✗ SEO DISTRIBUTION VALIDATION FAILED — BUILD BLOCKED\n");
  for (const e of errors) console.error(`  ↳ ${e}`);
  console.error("");
  process.exit(1);
}

console.log(`✓ validate-seo: ${locs.length} sitemap URLs verified absolute + pre-rendered; robots.txt is Search Console-ready.`);
