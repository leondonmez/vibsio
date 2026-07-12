/**
 * LAYER 4 ORCHESTRATOR — governance panel bindings.
 * Framework toggles ↔ state.g.frameworks (URL hash), live DoD preview.
 */

import { getState, update } from "./state.js";
import { activeDirectives } from "../utils/complianceProfiles.js";

const $ = (sel) => document.querySelector(sel);

function renderDodPreview() {
  const { frameworks } = getState().g;
  const directives = activeDirectives(frameworks);
  const badge = $("#governance-count");
  if (badge) {
    badge.textContent = `${frameworks.length} active`;
    badge.className = frameworks.length
      ? "rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
      : "rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  }
  const box = $("#governance-dod");
  const list = $("#governance-dod-list");
  if (!box || !list) return;
  box.classList.toggle("hidden", directives.dod.length === 0);
  list.replaceChildren(
    ...directives.dod.map((rule) => {
      const li = document.createElement("li");
      li.textContent = `✓ ${rule}`;
      return li;
    }),
  );
}

export function refreshGovernanceUi() {
  const { frameworks } = getState().g;
  document.querySelectorAll("[data-framework]").forEach((box) => {
    box.checked = frameworks.includes(box.dataset.framework);
  });
  renderDodPreview();
}

export function initGovernance() {
  document.querySelectorAll("[data-framework]").forEach((box) => {
    box.addEventListener("change", () => {
      update((d) => {
        const key = box.dataset.framework;
        d.g.frameworks = box.checked
          ? [...d.g.frameworks, key]
          : d.g.frameworks.filter((k) => k !== key);
      });
      renderDodPreview();
    });
  });
  refreshGovernanceUi();
}
