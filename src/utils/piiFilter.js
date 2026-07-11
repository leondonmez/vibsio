/**
 * LAYER 3 — CLIENT-SIDE PII / SECRET SANITIZER.
 * Runs locally in the browser the instant the generate action fires,
 * BEFORE any payload is compiled. Corporate security liabilities are
 * swapped for generic tokens; the user's on-screen text is never mutated.
 * Pure functions — no DOM, no network.
 */

const RULES = [
  {
    label: "AWS access key",
    token: "[REDACTED_AWS_KEY]",
    re: /\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g,
  },
  {
    label: "JWT / bearer token",
    token: "[REDACTED_TOKEN]",
    re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\b/g,
  },
  {
    label: "JWT / bearer token",
    token: "Bearer [REDACTED_TOKEN]",
    re: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi,
  },
  {
    label: "credential assignment",
    token: "$1$2[REDACTED_SECRET]",
    re: /\b(api[_-]?key|access[_-]?key|secret|token|passwd|password)\b(\s*[:=]\s*["']?)[^\s"']{8,}/gi,
  },
  {
    label: "email address",
    token: "[REDACTED_EMAIL]",
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    label: "IP address",
    token: "[REDACTED_IP]",
    re: /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{2,5})?\b/g,
  },
];

/**
 * Sanitize a text block. Returns the cleaned string plus a findings
 * summary ({ label: count }) for surfacing in the UI log.
 */
export function sanitize(text) {
  let clean = String(text ?? "");
  const findings = {};
  for (const rule of RULES) {
    clean = clean.replace(rule.re, (...args) => {
      findings[rule.label] = (findings[rule.label] ?? 0) + 1;
      // Support backreference tokens (credential assignments keep the key name)
      return rule.token.replace(/\$(\d)/g, (_, i) => args[Number(i)] ?? "");
    });
  }
  return { clean, findings, redacted: Object.values(findings).reduce((a, b) => a + b, 0) };
}

/** Human-readable one-liner for the terminal log / toast. */
export function describeFindings(findings) {
  const parts = Object.entries(findings).map(([label, n]) => `${n} ${label}${n > 1 ? "s" : ""}`);
  return parts.length ? parts.join(", ") : "no sensitive patterns";
}
