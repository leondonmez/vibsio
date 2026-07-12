/**
 * WORKSPACE TAB NAVIGATOR — zero-latency class-toggle switching.
 * Panels are shown/hidden with `hidden` state management only; no DOM is
 * destroyed, so global state, live renders, and the URL-hash string are
 * never interrupted. The active tab is a UI preference (sessionStorage),
 * deliberately NOT part of the shareable hash state.
 */

const TABS = ["quant", "blueprint", "admin"];
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
  }
  try {
    sessionStorage.setItem(LS_TAB, name);
  } catch {
    /* private mode — tab just resets next visit */
  }
}

export function getActiveTab() {
  return TABS.find((t) => document.getElementById(`tab-${t}`)?.getAttribute("aria-selected") === "true") ?? "quant";
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
  setActiveTab(TABS.includes(saved) ? saved : "quant");
}
