/**
 * LAYER 4 ORCHESTRATOR — token manager drawer + one-click publish.
 * Credentials round-trip only between the form and localStorage; the
 * publish action reads the live Layer 3 task matrix from state.
 */

import { getState } from "./state.js";
import {
  readIntegrations,
  writeIntegrations,
  clearIntegrations,
  publishBlueprint,
} from "../utils/exportPipeline.js";

const $ = (sel) => document.querySelector(sel);

function setDrawer(open) {
  const drawer = $("#token-manager");
  const backdrop = $("#token-backdrop");
  if (!drawer) return;
  drawer.classList.toggle("translate-x-full", !open);
  drawer.setAttribute("aria-hidden", String(!open));
  backdrop?.classList.toggle("hidden", !open);
  if (open) {
    fillForm();
    $("#token-close")?.focus();
  }
}

function fillForm() {
  const { jira, linear } = readIntegrations();
  $("#jira-url").value = jira?.baseUrl ?? "";
  $("#jira-email").value = jira?.email ?? "";
  $("#jira-token").value = jira?.token ?? "";
  $("#jira-project").value = jira?.projectKey ?? "";
  $("#linear-key").value = linear?.apiKey ?? "";
  $("#linear-team").value = linear?.teamId ?? "";
}

function saveForm() {
  writeIntegrations({
    jira: {
      baseUrl: $("#jira-url").value.trim(),
      email: $("#jira-email").value.trim(),
      token: $("#jira-token").value.trim(),
      projectKey: $("#jira-project").value.trim().toUpperCase(),
    },
    linear: {
      apiKey: $("#linear-key").value.trim(),
      teamId: $("#linear-team").value.trim(),
    },
  });
  toast("Tokens saved to this browser only — never to the URL or any server.");
}

function tasksFromState() {
  const { r } = getState();
  return [
    ...r.tasks.core.map((t) => ({ text: t.t, track: "core", tag: t.tag ?? "eng" })),
    ...r.tasks.cross.map((t) => ({ text: t.t, track: "cross", tag: t.tag ?? "eng" })),
  ];
}

function renderResults(html) {
  const box = $("#publish-results");
  if (!box) return;
  box.classList.remove("hidden");
  box.replaceChildren(...html);
}

async function publish() {
  const btn = $("#publish-btn");
  const target = $("#publish-target").value;
  const state = getState();
  btn.disabled = true;
  btn.textContent = "Publishing…";

  const result = await publishBlueprint({
    target,
    tasks: tasksFromState(),
    meta: { blueprint: state.p.title || state.name },
    onProgress: (done, total) => {
      btn.textContent = `Publishing… ${done}/${total}`;
    },
  });

  btn.disabled = false;
  btn.textContent = "🚀 Publish Directly to Project Board";

  const nodes = [];
  const line = (text, cls) => {
    const p = document.createElement("p");
    p.textContent = text;
    p.className = cls;
    return p;
  };
  if (result.error) {
    nodes.push(line(`✕ ${result.error}`, "font-medium text-rose-600 dark:text-rose-400"));
  }
  if (result.created.length) {
    nodes.push(
      line(
        `✓ Created ${result.created.length} issues: ${result.created.map((c) => c.id).join(", ")}`,
        "font-medium text-emerald-600 dark:text-emerald-400",
      ),
    );
  }
  for (const f of result.failed) {
    nodes.push(line(`✕ ${f.title}: ${f.error}`, "text-rose-600 dark:text-rose-400"));
  }
  if (!nodes.length) nodes.push(line("Nothing happened — no tasks and no errors.", "text-slate-500"));
  renderResults(nodes);
}

function toast(message) {
  document.dispatchEvent(new CustomEvent("vibsio:toast", { detail: { message } }));
}

export function initIntegrations() {
  $("#open-token-manager")?.addEventListener("click", () => setDrawer(true));
  $("#token-close")?.addEventListener("click", () => setDrawer(false));
  $("#token-backdrop")?.addEventListener("click", () => setDrawer(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setDrawer(false);
  });
  $("#token-save")?.addEventListener("click", saveForm);
  $("#token-clear")?.addEventListener("click", () => {
    clearIntegrations();
    fillForm();
    toast("All integration tokens removed from this browser.");
  });
  $("#publish-btn")?.addEventListener("click", publish);
}
