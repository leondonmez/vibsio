/**
 * WORKSPACE TAB NAVIGATOR — zero-latency class-toggle switching.
 * Panels are shown/hidden with `hidden` state management only; no DOM is
 * destroyed, so global state, live renders, and the URL-hash string are
 * never interrupted. The active tab is a UI preference (sessionStorage),
 * deliberately NOT part of the shareable hash state.
 */

// Chronological PM sequence — blueprint (Scope & Requirements) is the default
const TABS = ["blueprint", "quant", "admin"];
const LS_TAB = "vibsio:tab";

const ACTIVE = ["border-indigo-600", "text-indigo-700", "dark:border-indigo-400", "dark:text-indigo-300"];
const INACTIVE = ["border-transparent", "text-slate-500", "hover:text-slate-700", "dark:text-slate-400", "dark:hover:text-slate-200"];

export function setActiveTab(name) {
  if (!TABS.includes(name)) return;
  for (const tab of TABS) {
    const btn = document.getElementById(`tab-${tab}`);
    const panel = document.getElementById(`tab-panel-${tab}`);
    const on = tab === name;
    if (btn) {
      btn.setAttribute("aria-selected", String(on));
      btn.tabIndex = on ? 0 : -1;
      btn.classList.remove(...(on ? INACTIVE : ACTIVE));
      btn.classList.add(...(on ? ACTIVE : INACTIVE));
    }
    if (panel) {
      panel.classList.toggle("hidden", !on);
      panel.classList.toggle("flex", on);
    }
    // AREA 5 — the persistent context pane routes its content per view
    const context = document.getElementById(`context-${tab}`);
    if (context) {
      context.classList.toggle("hidden", !on);
      context.classList.toggle("flex", on);
    }
  }
  // Views without context content (e.g. single-column Scope & Requirements)
  // collapse the right pane and hand its track back to the main canvas.
  const pane = document.getElementById("context-pane");
  const columns = document.getElementById("app-columns");
  const hasContext = !!document.getElementById(`context-${name}`);
  pane?.classList.toggle("hidden", !hasContext);
  columns?.classList.toggle("lg:grid-cols-[15rem_minmax(0,1fr)_minmax(0,40%)]", hasContext);
  columns?.classList.toggle("lg:grid-cols-[15rem_minmax(0,1fr)]", !hasContext);
  try {
    sessionStorage.setItem(LS_TAB, name);
  } catch {
    /* private mode — tab just resets next visit */
  }
  // Panels that auto-size content (e.g. story textareas) need a nudge once
  // they're actually visible — measurements are 0 while display:none.
  document.dispatchEvent(new CustomEvent("vibsio:tabshown", { detail: name }));
}

export function getActiveTab() {
  return TABS.find((t) => document.getElementById(`tab-${t}`)?.getAttribute("aria-selected") === "true") ?? "blueprint";
}

export function initTabs() {
  const buttons = TABS.map((t) => document.getElementById(`tab-${t}`)).filter(Boolean);
  for (const btn of buttons) {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
    // Roving arrow-key navigation per WAI-ARIA tabs pattern
    btn.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const idx = buttons.indexOf(btn);
      const next = buttons[(idx + (e.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length];
      setActiveTab(next.dataset.tab);
      next.focus();
    });
  }
  let saved = null;
  try {
    saved = sessionStorage.getItem(LS_TAB);
  } catch {
    /* noop */
  }
  setActiveTab(TABS.includes(saved) ? saved : "blueprint");
}
