/**
 * LAYER 3 ORCHESTRATOR — Qualitative Requirement Blueprint Engine.
 *
 * - Epic intake + chameleon controls (stack / seniority / syntax) → state.r
 * - PII filter → payload compile → streaming generation terminal
 * - Cloud pipeline targets the serverless route /api/blueprint (NDJSON
 *   stream); guests and unreachable-endpoint sessions run the built-in
 *   client-side synthesizer so the module is always fully interactive.
 * - Segmented task matrix with inline edit, integration drawer + clipboard.
 */

import { getState, update } from "./state.js";
import { sanitize, describeFindings } from "../utils/piiFilter.js";
import {
  toMarkdown,
  toJson,
  stackLabel,
  seniorityLabel,
  tagLabel,
} from "../utils/clipboardPackager.js";
import { AUTH_STATES, getAuthState, getAccessToken } from "./auth.js";

const $ = (sel) => document.querySelector(sel);
const CLOUD_ENDPOINT = "/api/blueprint";

/* ================================================================ */
/* CONTROLS — stack, seniority, syntax bind straight into state.r    */
/* ================================================================ */

export function pushBlueprintInputs() {
  const { r } = getState();
  const epic = $("#epic-input");
  const stack = $("#stack-select");
  if (epic && epic.value !== r.epic) epic.value = r.epic;
  if (stack && stack.value !== r.stack) stack.value = r.stack;
  reflectSegments("#seniority-group", r.seniority);
  reflectSegments("#syntax-group", r.syntax);
}

function reflectSegments(groupSel, active) {
  document.querySelectorAll(`${groupSel} [data-value]`).forEach((btn) => {
    const on = btn.dataset.value === active;
    btn.setAttribute("aria-pressed", String(on));
    btn.classList.toggle("bg-indigo-600", on);
    btn.classList.toggle("text-white", on);
    btn.classList.toggle("shadow-sm", on);
    btn.classList.toggle("text-slate-600", !on);
    btn.classList.toggle("dark:text-slate-300", !on);
  });
}

function initControls() {
  $("#epic-input")?.addEventListener("input", (e) => {
    update((d) => {
      d.r.epic = e.target.value;
    });
  });
  $("#stack-select")?.addEventListener("change", (e) => {
    update((d) => {
      d.r.stack = e.target.value;
    });
  });
  for (const [groupSel, field] of [
    ["#seniority-group", "seniority"],
    ["#syntax-group", "syntax"],
  ]) {
    document.querySelectorAll(`${groupSel} [data-value]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        update((d) => {
          d.r[field] = btn.dataset.value;
        });
        reflectSegments(groupSel, btn.dataset.value);
      });
    });
  }
  $("#generate-btn")?.addEventListener("click", generate);
}

/* ================================================================ */
/* GENERATION TERMINAL                                               */
/* ================================================================ */

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function termLineEl(text, tone = "default") {
  const line = document.createElement("div");
  line.textContent = text;
  line.className = {
    default: "text-slate-300",
    dim: "text-slate-500",
    ok: "text-emerald-400",
    warn: "text-amber-400",
    task: "text-indigo-300",
  }[tone];
  return line;
}

async function termType(text, tone) {
  const out = $("#terminal-output");
  if (!out) return;
  const line = termLineEl("", tone);
  out.append(line);
  // Type in 3-char chunks — fast enough to feel live, slow enough to read
  for (let i = 0; i < text.length; i += 3) {
    line.textContent = text.slice(0, i + 3);
    out.scrollTop = out.scrollHeight;
    await delay(8);
  }
  line.textContent = text;
}

function termReset() {
  $("#terminal-output")?.replaceChildren();
}

function setTerminalRunning(on) {
  $("#terminal-caret")?.classList.toggle("hidden", !on);
  $("#terminal-status").textContent = on ? "streaming" : "idle";
  $("#terminal-status").className = on
    ? "text-[11px] font-medium text-emerald-400"
    : "text-[11px] font-medium text-slate-500";
  const btn = $("#generate-btn");
  if (btn) {
    btn.disabled = on;
    btn.classList.toggle("opacity-60", on);
    btn.textContent = on ? "Synthesizing…" : "⚡ Generate Blueprint";
  }
}

/* ================================================================ */
/* LOCAL SYNTHESIZER (client-side fallback engine)                   */
/* ================================================================ */

const STACK_PROFILES = {
  "nextjs-supabase": {
    db: "Supabase Postgres schema + RLS policies",
    api: "Next.js route handler",
    ui: "React server component",
    auth: "Supabase Auth session guard",
    infra: "Vercel project env + edge config",
    test: "Playwright end-to-end suite",
  },
  "django-postgres": {
    db: "PostgreSQL migration + Django model",
    api: "Django REST Framework endpoint",
    ui: "Django template / HTMX partial",
    auth: "Django auth middleware",
    infra: "Gunicorn + Nginx deployment manifest",
    test: "pytest integration suite",
  },
  "laravel-livewire": {
    db: "Eloquent migration + model factory",
    api: "Laravel controller action",
    ui: "Livewire component",
    auth: "Laravel sanctum guard",
    infra: "Forge deployment recipe",
    test: "PHPUnit feature test",
  },
  "astro-tailwind": {
    db: "content collection / data module",
    api: "Astro endpoint",
    ui: "Astro island component",
    auth: "middleware session check",
    infra: "static build + CDN cache rules",
    test: "Vitest + Playwright smoke suite",
  },
  "spring-mysql": {
    db: "MySQL Flyway migration + JPA entity",
    api: "Spring Boot REST controller",
    ui: "Thymeleaf/React admin view",
    auth: "Spring Security filter chain",
    infra: "Docker compose + CI pipeline stage",
    test: "JUnit + Testcontainers suite",
  },
};

function acceptance(subject, syntax, behavior) {
  return syntax === "bdd"
    ? `Given ${subject} exists, When ${behavior}, Then the outcome is persisted and surfaced to the user`
    : `AC: ${behavior} works end-to-end and is covered by a test`;
}

function synthesizeBlueprint({ epic, stack, seniority, syntax }) {
  const prof = STACK_PROFILES[stack] ?? STACK_PROFILES["nextjs-supabase"];
  const subject =
    epic.split(/[.!?\n]/)[0].trim().slice(0, 80) || "the feature";
  const granular = seniority === "junior";
  const brief = seniority === "senior";

  const mk = (t, tag) => ({ id: crypto.randomUUID(), t, ...(tag ? { tag } : {}) });
  const core = [];
  core.push(mk(`Model the ${prof.db} for "${subject}"\n${acceptance(subject, syntax, "the data model stores and retrieves the required fields")}`));
  core.push(mk(`Implement the ${prof.api} exposing create/read/update flows for ${subject}\n${acceptance(subject, syntax, "a client submits valid input via the API")}`));
  core.push(mk(`Build the ${prof.ui} rendering the primary ${subject} workflow\n${acceptance(subject, syntax, "a user completes the happy-path flow in the UI")}`));
  core.push(mk(`Wire the ${prof.auth} so only permitted roles reach ${subject}\n${acceptance(subject, syntax, "an unauthorized session attempts access")}`));
  if (!brief) {
    core.push(mk(`Add input validation + error surfaces for every ${subject} form state\n${acceptance(subject, syntax, "a user submits malformed or empty input")}`));
  }
  if (granular) {
    core.push(mk(`Write inline developer docs + a README section for the ${subject} module (pair with a senior for review)\n${acceptance(subject, syntax, "a new teammate follows the doc to run the flow locally")}`));
    core.push(mk(`Create seed/fixture data so ${subject} is demoable in every environment\n${acceptance(subject, syntax, "the seed script runs idempotently")}`));
  }

  const cross = [
    mk(`Author a ${prof.test} covering the ${subject} happy path plus the top failure mode`, "qa"),
    mk(`Add a regression scenario asserting ${subject} permissions cannot be bypassed`, "qa"),
    mk(`Update ${prof.infra} for the new ${subject} surface (secrets, env vars, build step)`, "devops"),
    mk(`Add observability: log + alert on ${subject} error rates above baseline`, "devops"),
    mk(`Spec empty, loading, and error micro-states for the ${subject} UI`, "ux"),
    mk(`Define responsive + dark-mode acceptance shots for ${subject} across breakpoints`, "ux"),
  ];

  return { core, cross };
}

/* ================================================================ */
/* CLOUD PIPELINE — serverless NDJSON stream                         */
/* ================================================================ */

async function cloudGenerate(payload) {
  const token = getAccessToken();
  const res = await fetch(CLOUD_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok || !res.body) throw new Error(`endpoint returned ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let tasks = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const evt = JSON.parse(line);
      if (evt.type === "log") await termType(evt.text, "dim");
      if (evt.type === "done") tasks = evt.tasks;
    }
  }
  if (!tasks) throw new Error("stream ended without a tasks payload");
  return tasks;
}

/* ================================================================ */
/* GENERATE ACTION                                                   */
/* ================================================================ */

let generating = false;

async function generate() {
  if (generating) return;
  const { r } = getState();
  if (!r.epic.trim()) {
    toast("Describe the epic first — the intake box is empty.");
    $("#epic-input")?.focus();
    return;
  }
  generating = true;
  setTerminalRunning(true);
  termReset();
  $("#generation-terminal")?.classList.remove("hidden");

  try {
    // 1. PII filter — always runs BEFORE the payload is compiled
    const { clean, findings, redacted } = sanitize(r.epic);
    await termType(`$ vibsio blueprint --stack ${r.stack} --level ${r.seniority} --syntax ${r.syntax}`, "dim");
    await termType(`→ PII filter: ${describeFindings(findings)} ${redacted ? "→ replaced with generic tokens" : "detected"}`, redacted ? "warn" : "ok");

    const payload = {
      epic: clean,
      stack: r.stack,
      seniority: r.seniority,
      syntax: r.syntax,
    };

    // 2. Cloud stream for authenticated users; local synthesis otherwise
    let tasks = null;
    if (getAuthState() !== AUTH_STATES.GUEST) {
      await termType("→ Contacting serverless orchestration endpoint…", "dim");
      try {
        tasks = await cloudGenerate(payload);
        await termType("→ Cloud stream complete.", "ok");
      } catch (err) {
        await termType(`→ Cloud endpoint unavailable (${err.message}) — engaging local synthesis engine.`, "warn");
      }
    } else {
      await termType("→ Guest session: engaging local draft engine (no data leaves this browser).", "ok");
    }
    if (!tasks) {
      await delay(250);
      tasks = synthesizeBlueprint(payload);
    }

    // 3. Stream the task lines into the terminal
    await termType(`→ Decomposing epic for a ${seniorityLabel(r.seniority)} on ${stackLabel(r.stack)}:`, "default");
    for (const t of tasks.core) await termType(`  [CORE] ${t.t.split("\n")[0]}`, "task");
    for (const t of tasks.cross) await termType(`  [${tagLabel(t.tag ?? "eng").split(" ")[0].toUpperCase()}] ${t.t.split("\n")[0]}`, "task");
    await termType(`✓ Blueprint compiled — ${tasks.core.length} core + ${tasks.cross.length} cross-functional tasks. Synced to URL.`, "ok");

    // 4. Commit to hash-synced state and render the matrix
    update((d) => {
      d.r.tasks = tasks;
    });
    renderBlueprintGrid();
    $("#blueprint-grid-section")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } finally {
    generating = false;
    setTerminalRunning(false);
  }
}

/* ================================================================ */
/* SEGMENTED TASK MATRIX + INLINE EDIT                               */
/* ================================================================ */

const TAG_BADGES = {
  eng: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  qa: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  devops: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  ux: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
};

function taskCard(task, track, idx) {
  const card = document.createElement("li");
  card.className =
    "group rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950";

  const top = document.createElement("div");
  top.className = "flex items-start justify-between gap-2";

  const badge = document.createElement("span");
  const tag = task.tag ?? "eng";
  badge.textContent = tagLabel(tag);
  badge.className = `rounded-full px-2 py-0.5 text-[10px] font-semibold ${TAG_BADGES[tag]}`;

  const actions = document.createElement("div");
  actions.className = "flex gap-1";
  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.textContent = "Edit";
  editBtn.className =
    "rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400";
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.textContent = "✕";
  delBtn.setAttribute("aria-label", "Delete task");
  delBtn.className =
    "rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400";
  actions.append(editBtn, delBtn);
  top.append(badge, actions);

  const body = document.createElement("p");
  body.textContent = task.t;
  body.className = "mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300";

  card.append(top, body);

  editBtn.addEventListener("click", () => {
    const area = document.createElement("textarea");
    area.value = task.t;
    area.rows = Math.min(6, task.t.split("\n").length + 1);
    area.maxLength = 600;
    area.setAttribute("aria-label", "Edit task text");
    area.className =
      "mt-2 w-full resize-y rounded-md border border-indigo-300 bg-white px-2.5 py-2 text-sm dark:border-indigo-700 dark:bg-slate-900";
    const commit = () => {
      const text = area.value.trim();
      update((d) => {
        if (text) d.r.tasks[track][idx].t = text;
        else d.r.tasks[track].splice(idx, 1);
      });
      renderBlueprintGrid();
    };
    area.addEventListener("blur", commit);
    area.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
      if (e.key === "Escape") renderBlueprintGrid();
    });
    body.replaceWith(area);
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
  });

  delBtn.addEventListener("click", () => {
    update((d) => {
      d.r.tasks[track].splice(idx, 1);
    });
    renderBlueprintGrid();
  });

  return card;
}

export function renderBlueprintGrid() {
  const coreList = $("#core-task-list");
  const crossList = $("#cross-task-list");
  if (!coreList || !crossList) return;
  const { tasks } = getState().r;

  const hasTasks = tasks.core.length + tasks.cross.length > 0;
  $("#blueprint-grid-section")?.classList.toggle("hidden", !hasTasks);
  $("#core-count").textContent = String(tasks.core.length);
  $("#cross-count").textContent = String(tasks.cross.length);

  coreList.replaceChildren(...tasks.core.map((t, i) => taskCard(t, "core", i)));
  crossList.replaceChildren(...tasks.cross.map((t, i) => taskCard(t, "cross", i)));
  refreshDrawerPreview();
}

/* ================================================================ */
/* INTEGRATION DRAWER + CLIPBOARD                                    */
/* ================================================================ */

let drawerFormat = "markdown";

function refreshDrawerPreview() {
  const pre = $("#drawer-preview");
  if (!pre) return;
  const state = getState();
  pre.textContent = drawerFormat === "markdown" ? toMarkdown(state) : toJson(state);
}

function setDrawer(open) {
  const drawer = $("#integration-drawer");
  const backdrop = $("#drawer-backdrop");
  if (!drawer) return;
  drawer.classList.toggle("translate-x-full", !open);
  drawer.setAttribute("aria-hidden", String(!open));
  backdrop?.classList.toggle("hidden", !open);
  if (open) {
    refreshDrawerPreview();
    $("#drawer-close")?.focus();
  }
}

function initDrawer() {
  $("#open-drawer-btn")?.addEventListener("click", () => setDrawer(true));
  $("#drawer-close")?.addEventListener("click", () => setDrawer(false));
  $("#drawer-backdrop")?.addEventListener("click", () => setDrawer(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setDrawer(false);
  });

  document.querySelectorAll("#drawer-format-group [data-format]").forEach((btn) => {
    btn.addEventListener("click", () => {
      drawerFormat = btn.dataset.format;
      document.querySelectorAll("#drawer-format-group [data-format]").forEach((b) => {
        const on = b === btn;
        b.setAttribute("aria-pressed", String(on));
        b.classList.toggle("bg-indigo-600", on);
        b.classList.toggle("text-white", on);
        b.classList.toggle("text-slate-600", !on);
        b.classList.toggle("dark:text-slate-300", !on);
      });
      refreshDrawerPreview();
    });
  });

  $("#drawer-copy-btn")?.addEventListener("click", async () => {
    const btn = $("#drawer-copy-btn");
    const state = getState();
    const text = drawerFormat === "markdown" ? toMarkdown(state) : toJson(state);
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "✓ Copied to Clipboard!";
      btn.classList.add("bg-emerald-600", "scale-[1.02]");
      btn.classList.remove("bg-indigo-600");
      setTimeout(() => {
        btn.textContent = "Copy to Clipboard";
        btn.classList.remove("bg-emerald-600", "scale-[1.02]");
        btn.classList.add("bg-indigo-600");
      }, 1600);
    } catch {
      toast("Clipboard access was blocked — select the preview text and copy manually.");
    }
  });
}

/* ================================================================ */
/* BOOT                                                              */
/* ================================================================ */

function toast(message) {
  document.dispatchEvent(new CustomEvent("vibsio:toast", { detail: { message } }));
}

/** Re-sync inputs + grid after hydration / workspace loads. */
export function refreshBlueprintUi() {
  pushBlueprintInputs();
  renderBlueprintGrid();
}

export function initBlueprint() {
  initControls();
  initDrawer();
  refreshBlueprintUi();
}
