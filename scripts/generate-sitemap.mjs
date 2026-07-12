/**
 * LAYER 4 — Absolute sitemap compilation.
 * Runs on predev/prebuild; compiles static routes + the full pSEO tool
 * matrix from the single TOOL_PAGES dictionary into public/sitemap.xml.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TOOL_PAGES } from "../src/data/toolPages.js";

const SITE = "https://vibs.io";
const today = new Date().toISOString().slice(0, 10);

const staticRoutes = [
  { path: "/", priority: "1.0" },
  { path: "/privacy", priority: "0.3" },
  { path: "/terms", priority: "0.3" },
];
const toolRoutes = TOOL_PAGES.map((p) => ({ path: `/tools/${p.slug}`, priority: "0.8" }));

const urls = [...staticRoutes, ...toolRoutes]
  .map(
    ({ path, priority }) => `  <url>
    <loc>${SITE}${path === "/" ? "/" : path}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority}</priority>
  </url>`,
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sitemap.xml");
writeFileSync(out, xml);
console.log(`sitemap: ${staticRoutes.length + toolRoutes.length} URLs → public/sitemap.xml`);
