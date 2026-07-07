#!/usr/bin/env node
/**
 * generate-sitemap.mjs — writes public/sitemap.xml for vibs.io.
 *
 * Reads SITE.domain from src/data/network.ts so the sitemap can never drift
 * from the site config. Wired to the `prebuild` and `predev` npm hooks, so
 * `npm run build` / `npm run dev` always regenerate it.
 *
 *   homepage root : priority 1.0, changefreq weekly
 *   legal pages   : priority 0.3, changefreq yearly
 *
 * ROUTES is a plain list; add a line here whenever a new top-level page is
 * introduced. (The portfolio properties live on their own domains and are
 * intentionally not part of this site's sitemap.)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Pull the canonical domain straight from the TS source of truth without a
// build step: strip type syntax we don't need and grab the domain literal.
const netSrc = await import('node:fs').then((fs) =>
  fs.readFileSync(resolve(root, 'src/data/network.ts'), 'utf8')
);
const domainMatch = netSrc.match(/domain:\s*'([^']+)'/);
const domain = domainMatch ? domainMatch[1] : 'https://vibs.io';

// W3C date (YYYY-MM-DD) for <lastmod>.
const lastmod = new Date().toISOString().slice(0, 10);

const ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
];

const body = ROUTES.map(({ path, changefreq, priority }) => {
  const loc = `${domain}${path === '/' ? '/' : path}`;
  return (
    `  <url>\n` +
    `    <loc>${loc}</loc>\n` +
    `    <lastmod>${lastmod}</lastmod>\n` +
    `    <changefreq>${changefreq}</changefreq>\n` +
    `    <priority>${priority}</priority>\n` +
    `  </url>`
  );
}).join('\n');

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  `${body}\n` +
  `</urlset>\n`;

const outPath = resolve(root, 'public/sitemap.xml');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, xml, 'utf8');

console.log(
  `[sitemap] wrote ${ROUTES.length} URLs → public/sitemap.xml (lastmod ${lastmod})`
);
