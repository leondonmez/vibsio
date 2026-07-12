/**
 * PRODUCTION GUARDRAIL — client-bundle secret audit.
 * Runs automatically after every `npm run build` (postbuild hook) and
 * scans EVERY text asset in dist/ for private-token patterns. Any hit
 * crashes the pipeline with a non-zero exit so the leak can never deploy.
 *
 * NOTE: the Supabase publishable key (sb_publishable_…) is client-safe by
 * design and is explicitly allowed; everything below is not.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const TEXT_EXT = new Set([".html", ".js", ".mjs", ".css", ".xml", ".txt", ".json", ".svg", ".webmanifest"]);

const PATTERNS = [
  { label: "Anthropic API key", re: /sk-ant-[A-Za-z0-9_-]{8,}/ },
  { label: "OpenAI-style secret key", re: /\bsk-proj-[A-Za-z0-9_-]{8,}/ },
  { label: "Supabase secret key", re: /sb_secret_[A-Za-z0-9_-]+/ },
  { label: "Supabase service-role reference", re: /\bservice_role\b/ },
  { label: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "Jira API token", re: /\bATATT[A-Za-z0-9_=-]{20,}/ },
  { label: "Linear API key", re: /\blin_api_[A-Za-z0-9]{8,}/ },
  { label: "Google OAuth client secret", re: /\bGOCSPX-[A-Za-z0-9_-]{10,}/ },
  { label: "Private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { label: "Env assignment of a key", re: /\b(?:ANTHROPIC|OPENAI|SUPABASE_SERVICE)[A-Z_]*_?KEY\s*[:=]\s*["'][^"']{12,}/ },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

let scanned = 0;
const hits = [];

try {
  for (const file of walk(DIST)) {
    if (!TEXT_EXT.has(extname(file))) continue;
    scanned += 1;
    const content = readFileSync(file, "utf8");
    for (const { label, re } of PATTERNS) {
      const match = content.match(re);
      if (match) {
        hits.push({ file: relative(DIST, file), label, sample: match[0].slice(0, 24) + "…" });
      }
    }
  }
} catch (err) {
  console.error(`✗ audit-env: could not scan dist/ — run the build first (${err.message})`);
  process.exit(1);
}

if (hits.length > 0) {
  console.error("\n✗ SECRET LEAK DETECTED IN CLIENT BUNDLE — BUILD BLOCKED\n");
  for (const h of hits) {
    console.error(`  ${h.file}\n    ↳ ${h.label}: ${h.sample}\n`);
  }
  console.error("Remove the secret from client-side source. Server keys belong in Supabase secrets only.\n");
  process.exit(1);
}

console.log(`✓ audit-env: ${scanned} bundle assets scanned — no private tokens in the client distribution.`);
