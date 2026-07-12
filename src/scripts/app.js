/**
 * APP ORCHESTRATOR — binds the core workspace shell to the state engine.
 * Vanilla client-side JavaScript only; no external state frameworks.
 */

import {
  DEFAULT_STATE,
  getState,
  update,
  replaceState,
  hydrate,
  syncNow,
  deserializePayload,
  clearCurrentSession,
} from "./state.js";
import { getMethodology, applyMethodologyLabels, METHODOLOGIES } from "./methodology.js";
import {
  AUTH_STATES,
  getAuthState,
  getAuthProfile,
  signInWithGoogle,
  signOut,
  captureAuthCallback,
  ensureFreshSession,
} from "./auth.js";
import {
  currentSessionId,
  readIndex,
  upsertWorkspace,
  renameWorkspace,
  deleteWorkspace,
  setSessionId,
  rotateSessionId,
} from "./workspaces.js";
import { initForecast, refreshForecastUi } from "./forecast.js";
import { initBlueprint, refreshBlueprintUi } from "./blueprint.js";
import { initGovernance, refreshGovernanceUi } from "./governance.js";
import { initIntegrations } from "./integrations.js";

const $ = (sel) => document.querySelector(sel);

/* ================================================================ */
/* THEME ENGINE — light default, class-based dark opt-in             */
/* ================================================================ */

function initTheme() {
  const btn = $("#theme-toggle");
  if (!btn) return;
  const reflect = () => {
    const dark = document.documentElement.classList.contains("dark");
    btn.setAttribute("aria-pressed", String(dark));
    $("#theme-icon-sun")?.classList.toggle("hidden", dark);
    $("#theme-icon-moon")?.classList.toggle("hidden", !dark);
  };
  btn.addEventListener("click", () => {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("vibsio:theme", dark ? "dark" : "light");
    } catch {
      /* noop */
    }
    reflect();
  });
  reflect();
}

/* ================================================================ */
/* FIELD BINDINGS — one-way in on hydrate, one-way out on input      */
/* ================================================================ */

function pushStateIntoInputs() {
  const s = getState();
  const map = {
    "#session-name": s.name,
    '[data-bind="p.title"]': s.p.title,
    '[data-bind="p.objective"]': s.p.objective,
    '[data-bind="p.start"]': s.p.start,
    '[data-bind="p.owner"]': s.p.owner,
    "#methodology-select": s.m,
  };
  for (const [sel, value] of Object.entries(map)) {
    const el = $(sel);
    if (el && el.value !== value) el.value = value;
  }
}

function initFieldBindings() {
  $("#session-name")?.addEventListener("input", (e) => {
    update((d) => {
      d.name = e.target.value;
    });
  });
  document.querySelectorAll("[data-bind]").forEach((el) => {
    el.addEventListener("input", () => {
      const key = el.dataset.bind.split(".")[1];
      update((d) => {
        d.p[key] = el.value;
      });
    });
  });
  $("#methodology-select")?.addEventListener("change", (e) => {
    update((d) => {
      d.m = e.target.value;
    });
    applyMethodologyLabels(e.target.value);
    renderItems();
    renderMetrics();
  });
}

/* ================================================================ */
/* ITEM BOARD                                                        */
/* ================================================================ */

function initItemForm() {
  $("#item-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const titleInput = $("#item-title");
    const effortInput = $("#item-effort");
    const title = titleInput.value.trim();
    if (!title) return;
    const effort = Math.max(0, Number(effortInput.value) || 0);
    update((d) => {
      d.items.push({ id: crypto.randomUUID(), t: title, s: 0, e: effort });
    });
    titleInput.value = "";
    effortInput.value = "";
    titleInput.focus();
    renderItems();
    renderMetrics();
  });
}

function renderItems() {
  const list = $("#item-list");
  const empty = $("#board-empty");
  if (!list) return;
  const s = getState();
  const dict = getMethodology(s.m);
  list.replaceChildren();
  empty?.classList.toggle("hidden", s.items.length > 0);

  for (const item of s.items) {
    const li = document.createElement("li");
    li.className =
      "flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900";

    const title = document.createElement("p");
    title.textContent = item.t;
    title.className = "min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200";

    const effort = document.createElement("span");
    effort.textContent = String(item.e);
    effort.title = dict.terms.effort;
    effort.className =
      "inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-50 px-2 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300";

    const status = document.createElement("select");
    status.setAttribute("aria-label", "Status");
    status.className =
      "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300";
    dict.statuses.forEach((label, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = label;
      opt.dataset.statusIndex = String(idx);
      opt.selected = item.s === idx;
      status.append(opt);
    });
    status.addEventListener("change", () => {
      update((d) => {
        const target = d.items.find((it) => it.id === item.id);
        if (target) target.s = Number(status.value);
      });
      renderMetrics();
    });

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "✕";
    del.setAttribute("aria-label", `Delete ${item.t}`);
    del.className =
      "rounded-md p-1.5 text-xs text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400";
    del.addEventListener("click", () => {
      update((d) => {
        d.items = d.items.filter((it) => it.id !== item.id);
      });
      renderItems();
      renderMetrics();
    });

    li.append(title, effort, status, del);
    list.append(li);
  }
}

function renderMetrics() {
  const s = getState();
  const total = s.items.length;
  const effort = s.items.reduce((sum, it) => sum + it.e, 0);
  const done = s.items.filter((it) => it.s === 2).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  if ($("#metric-items")) $("#metric-items").textContent = String(total);
  if ($("#metric-effort")) $("#metric-effort").textContent = String(effort);
  if ($("#metric-done")) $("#metric-done").textContent = `${pct}%`;
}

/* ================================================================ */
/* WORKSPACE SIDEBAR                                                 */
/* ================================================================ */

function formatWhen(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function renderSidebar() {
  const list = $("#workspace-list");
  if (!list) return;
  const activeId = currentSessionId();
  const entries = readIndex();
  list.replaceChildren();

  if (entries.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No saved workspaces yet — start planning and this list fills itself.";
    li.className = "px-3 py-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400";
    list.append(li);
    return;
  }

  for (const entry of entries) {
    const li = document.createElement("li");
    const isActive = entry.id === activeId;
    li.className = `group rounded-lg border px-3 py-2.5 transition ${
      isActive
        ? "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/50"
        : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-900"
    }`;

    const nameRow = document.createElement("div");
    nameRow.className = "flex items-center gap-2";

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.textContent = entry.name || "Untitled Blueprint";
    loadBtn.title = "Load this workspace";
    loadBtn.className =
      "min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400";
    loadBtn.addEventListener("click", () => loadWorkspace(entry));

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.textContent = "Rename";
    renameBtn.className =
      "rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200";
    renameBtn.addEventListener("click", () => startRename(entry, li, nameRow));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "Delete";
    delBtn.setAttribute("aria-label", `Delete workspace ${entry.name}`);
    delBtn.className =
      "rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-rose-100 hover:text-rose-700 dark:text-slate-400 dark:hover:bg-rose-950 dark:hover:text-rose-400";
    delBtn.addEventListener("click", () => {
      deleteWorkspace(entry.id);
      renderSidebar();
    });

    nameRow.append(loadBtn, renameBtn, delBtn);

    const meta = document.createElement("p");
    meta.className = "mt-0.5 text-[11px] text-slate-500 dark:text-slate-400";
    meta.textContent = `${METHODOLOGIES[entry.m]?.label ?? "Scrum"} · ${formatWhen(entry.updatedAt ?? Date.now())}`;

    li.append(nameRow, meta);
    list.append(li);
  }
}

function startRename(entry, li, nameRow) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = entry.name || "";
  input.setAttribute("aria-label", "Workspace name");
  input.className =
    "w-full rounded-md border border-indigo-300 bg-white px-2 py-1 text-sm dark:border-indigo-700 dark:bg-slate-950";
  const commit = () => {
    const name = input.value.trim() || "Untitled Blueprint";
    renameWorkspace(entry.id, name);
    if (entry.id === currentSessionId()) {
      update((d) => {
        d.name = name;
      });
      pushStateIntoInputs();
    }
    renderSidebar();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") renderSidebar();
  });
  input.addEventListener("blur", commit);
  nameRow.replaceChildren(input);
  input.focus();
  input.select();
}

async function loadWorkspace(entry) {
  const next = await deserializePayload(entry.payload);
  if (!next) {
    toast("That workspace payload is corrupted and could not be loaded.");
    return;
  }
  setSessionId(entry.id);
  replaceState(next);
  applyMethodologyLabels(next.m);
  pushStateIntoInputs();
  renderItems();
  renderMetrics();
  renderSidebar();
  refreshForecastUi();
  refreshBlueprintUi();
  refreshGovernanceUi();
}

function initSidebarActions() {
  $("#new-blueprint-btn")?.addEventListener("click", () => {
    rotateSessionId();
    clearCurrentSession();
    replaceState(structuredClone(DEFAULT_STATE));
    applyMethodologyLabels("scrum");
    pushStateIntoInputs();
    renderItems();
    renderMetrics();
    renderSidebar();
    refreshForecastUi();
    refreshBlueprintUi();
    refreshGovernanceUi();
    $("#session-name")?.focus();
  });
}

/* ================================================================ */
/* 3-STATE AUTH INDICATOR + AI GATE                                  */
/* ================================================================ */

function renderAuthIndicator() {
  const wrap = $("#auth-indicator");
  if (!wrap) return;
  const authState = getAuthState();
  const profile = getAuthProfile();
  wrap.replaceChildren();

  const dot = document.createElement("span");
  dot.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "truncate";

  if (authState === AUTH_STATES.GUEST) {
    dot.className = "h-2 w-2 shrink-0 rounded-full bg-slate-400";
    label.textContent = "Local Sandbox";
    wrap.title = "Guest mode — your workspace lives entirely in this URL and this browser.";
  } else if (authState === AUTH_STATES.FREE) {
    dot.className = "h-2 w-2 shrink-0 rounded-full bg-emerald-500";
    label.textContent = `${profile?.name ?? "Signed in"} · Cloud`;
    wrap.title = "Signed in — workspaces are cloud-backed.";
  } else {
    dot.className = "h-2 w-2 shrink-0 rounded-full bg-amber-400";
    label.textContent = `${profile?.name ?? "Signed in"} · Premium`;
    wrap.title = "Premium — enterprise features unlocked.";
  }
  if (profile?.avatar) {
    const img = document.createElement("img");
    img.src = profile.avatar;
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.className = "h-4.5 w-4.5 shrink-0 rounded-full";
    wrap.append(img);
  }
  wrap.append(dot, label);

  const signinBtn = $("#auth-signin-btn");
  const signoutBtn = $("#auth-signout-btn");
  signinBtn?.classList.toggle("hidden", authState !== AUTH_STATES.GUEST);
  signoutBtn?.classList.toggle("hidden", authState === AUTH_STATES.GUEST);
}

let lastFocused = null;

function openAiGate() {
  const modal = $("#ai-gate");
  if (!modal) return;
  lastFocused = document.activeElement;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  $("#ai-gate-signin")?.focus();
}

function closeAiGate() {
  const modal = $("#ai-gate");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  if (lastFocused instanceof HTMLElement) lastFocused.focus();
}

function initAuthUi() {
  $("#auth-signin-btn")?.addEventListener("click", signInWithGoogle);
  $("#ai-gate-signin")?.addEventListener("click", signInWithGoogle);
  $("#auth-signout-btn")?.addEventListener("click", () => {
    signOut();
    renderAuthIndicator();
  });
  document.addEventListener("vibsio:authchange", renderAuthIndicator);

  document.querySelectorAll("[data-requires-auth]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (getAuthState() === AUTH_STATES.GUEST) {
        e.preventDefault();
        openAiGate();
      } else {
        toast("AI planning modules arrive in Layer 2 — your account is ready for them.");
      }
    });
  });

  $("#ai-gate-close")?.addEventListener("click", closeAiGate);
  $("#ai-gate")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeAiGate();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAiGate();
  });
}

/* ================================================================ */
/* TOASTS + SYNC STATUS                                              */
/* ================================================================ */

function toast(message) {
  const region = $("#toast-region");
  if (!region) return;
  const el = document.createElement("div");
  el.textContent = message;
  el.className =
    "pointer-events-auto max-w-sm rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
  region.append(el);
  setTimeout(() => el.remove(), 4500);
}

function initSyncStatus() {
  document.addEventListener("vibsio:synced", (e) => {
    const s = getState();
    upsertWorkspace({
      id: currentSessionId(),
      name: s.name,
      m: s.m,
      payload: e.detail.payload,
    });
    renderSidebar();
    const status = $("#sync-status");
    if (status) {
      status.textContent = "Synced to URL";
      status.classList.remove("opacity-0");
      clearTimeout(initSyncStatus._t);
      initSyncStatus._t = setTimeout(() => status.classList.add("opacity-0"), 1500);
    }
  });
}

/* ================================================================ */
/* BOOT                                                              */
/* ================================================================ */

async function boot() {
  initTheme();
  // Toast listener first — auth callback capture below emits toasts.
  document.addEventListener("vibsio:toast", (e) => toast(e.detail.message));

  // OAuth callback tokens arrive in the URL hash — the same slot the state
  // engine owns. Capture + strip them BEFORE hydrate() reads the hash; the
  // workspace then restores from its localStorage recovery copy.
  await captureAuthCallback();
  await ensureFreshSession();

  const source = await hydrate();
  const s = getState();

  applyMethodologyLabels(s.m);
  pushStateIntoInputs();
  initFieldBindings();
  initItemForm();
  renderItems();
  renderMetrics();
  initSidebarActions();
  renderSidebar();
  initAuthUi();
  renderAuthIndicator();
  initSyncStatus();
  initForecast();
  initBlueprint();
  initGovernance();
  initIntegrations();
  // Gated modules (e.g. the resource overlay lock) can summon the auth gate
  document.addEventListener("vibsio:opengate", openAiGate);

  if (source === "recovered") {
    toast("Previous session recovered from this browser — no account needed.");
  }
  if (source === "fresh") {
    await syncNow();
  }

  // Pasting a different share-link hash rehydrates the workspace live.
  window.addEventListener("hashchange", async () => {
    const next = await deserializePayload(location.hash.slice(1));
    if (!next) return;
    replaceState(next, { sync: false });
    applyMethodologyLabels(next.m);
    pushStateIntoInputs();
    renderItems();
    renderMetrics();
    renderSidebar();
    refreshForecastUi();
    refreshBlueprintUi();
    refreshGovernanceUi();
  });
}

boot();
