/**
 * LAYER 3 — UNIVERSAL MARKDOWN / JSON CLIPBOARD PACKAGER.
 * Reads the live task-grid state and compiles it into paste-ready formats
 * for legacy enterprise trackers (Jira, Linear, Asana, Azure DevOps).
 * Pure functions — no DOM, no network.
 */

const STACK_LABELS = {
  "nextjs-supabase": "Next.js + Supabase",
  "django-postgres": "Django + PostgreSQL",
  "laravel-livewire": "Laravel + Livewire",
  "astro-tailwind": "Astro + Tailwind",
  "spring-mysql": "Spring Boot + MySQL",
};

const SENIORITY_LABELS = {
  junior: "Junior Developer",
  mid: "Mid-Level Engineer",
  senior: "Senior Technical Lead",
};

const TAG_LABELS = {
  eng: "Engineering",
  qa: "QA / Test Automation",
  devops: "DevOps / Infrastructure",
  ux: "UX / UI Micro-Specs",
};

export function stackLabel(key) {
  return STACK_LABELS[key] ?? key;
}
export function seniorityLabel(key) {
  return SENIORITY_LABELS[key] ?? key;
}
export function tagLabel(key) {
  return TAG_LABELS[key] ?? "Extension";
}

/**
 * FORMAT A — Universal Markdown Document.
 * Hierarchical headers, italicized metadata summary, `- [ ]` checkboxes.
 */
export function toMarkdown(state) {
  const { r, name, p } = state;
  const lines = [];
  lines.push(`# ${p.title || name || "Requirement Blueprint"}`);
  lines.push("");
  lines.push(
    `*Generated blueprint — stack: **${stackLabel(r.stack)}** · calibrated for: **${seniorityLabel(r.seniority)}** · acceptance syntax: **${r.syntax === "bdd" ? "BDD (Given-When-Then)" : "Functional checklist"}***`,
  );
  lines.push("");

  lines.push("## Core Engineering Requirements");
  lines.push("");
  if (r.tasks.core.length === 0) lines.push("_No core tasks generated yet._");
  for (const task of r.tasks.core) {
    const [head, ...rest] = task.t.split("\n");
    lines.push(`- [ ] ${head}`);
    for (const sub of rest) lines.push(`  - ${sub}`);
  }
  lines.push("");

  lines.push("## Cross-Functional Extensions");
  lines.push("");
  if (r.tasks.cross.length === 0) lines.push("_No cross-functional tasks generated yet._");
  let lastTag = null;
  for (const task of r.tasks.cross) {
    const tag = task.tag ?? "eng";
    if (tag !== lastTag) {
      lines.push(`**${tagLabel(tag)}**`);
      lastTag = tag;
    }
    const [head, ...rest] = task.t.split("\n");
    lines.push(`- [ ] ${head}`);
    for (const sub of rest) lines.push(`  - ${sub}`);
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * FORMAT B — Structured JSON Array (minified, API-payload ready).
 */
export function toJson(state) {
  const { r, name, p } = state;
  return JSON.stringify({
    blueprint: p.title || name || "Requirement Blueprint",
    meta: { stack: r.stack, seniority: r.seniority, syntax: r.syntax },
    tasks: [
      ...r.tasks.core.map((t) => ({ id: t.id, track: "core", tag: t.tag ?? "eng", text: t.t })),
      ...r.tasks.cross.map((t) => ({ id: t.id, track: "cross", tag: t.tag ?? "eng", text: t.t })),
    ],
  });
}
