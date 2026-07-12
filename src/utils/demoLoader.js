/**
 * ENTRY OVERHAUL — one-click demo workspace loader.
 *
 * Builds a complete, realistic enterprise project template and injects it
 * THROUGH the URL-hash engine itself: the state is serialized, written to
 * location.hash, and the existing hashchange hydration pipeline refreshes
 * every module (fields, board, grid, forecast, chart, epic). State
 * synchronization is guaranteed by construction — the demo IS a share link.
 */

import { serializeState } from "../scripts/state.js";

function nextMonday() {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

function demoState() {
  const item = (t, s, e) => ({ id: crypto.randomUUID(), t, s, e });
  return {
    v: 1,
    name: "Next-Gen E-Commerce Platform Rewrite",
    m: "scrum",
    p: {
      title: "Next-Gen E-Commerce Platform Rewrite",
      objective:
        "Replace the legacy monolith storefront with a modular platform: sub-second page loads, localized checkout in 12 markets, and a merchandising CMS the growth team can operate without engineering tickets.",
      start: nextMonday(),
      owner: "Maya Chen",
    },
    items: [
      item("As a shopper, I can check out as a guest in under 90 seconds", 2, 8),
      item("As a merchandiser, I can schedule a homepage takeover from the CMS", 1, 13),
      item("As a shopper, I see localized pricing and tax at the cart line level", 1, 8),
      item("As an operator, I can roll back a catalog import in one click", 0, 5),
      item("As a shopper, my cart survives across devices when I sign in", 0, 8),
    ],
    f: {
      hist: [
        [1, 34],
        [2, 41],
        [3, 38],
        [4, 47],
        [5, 44],
        [6, 52],
      ],
      backlog: 320,
      target: "",
      creep: 25,
      fteBase: 5,
      fte: 5,
      friction: 1,
    },
    g: { frameworks: [] },
    r: {
      epic: "Rebuild checkout end to end. Guest checkout is table stakes, apple/google pay one-tap, address autocomplete, promo stacking rules are a mess today (finance wants max 2 stacked, legal wants regional exclusions). Payment retries currently eat 3% of orders — need idempotent capture + async webhook reconciliation. Also the fraud team wants a review queue before high-value orders ship. Probably needs a feature flag rollout by market, start with CA/AU before US holiday freeze.",
      stack: "nextjs-supabase",
      seniority: "mid",
      syntax: "checklist",
      tasks: { core: [], cross: [] },
    },
  };
}

/**
 * Inject the template and hydrate the whole dashboard. Idempotent: firing
 * twice simply re-applies the same hash.
 */
export async function launchDemo() {
  const payload = await serializeState(demoState());
  const target = `#${payload}`;
  if (location.hash === target) {
    // Already loaded — just take the user to the live workspace
    document.querySelector("#main")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  location.hash = payload; // hashchange → full rehydration of every module
  document.dispatchEvent(
    new CustomEvent("vibsio:toast", {
      detail: {
        message: "Sample workspace loaded — every number is live. The URL now holds the whole plan.",
      },
    }),
  );
  requestAnimationFrame(() => {
    document.querySelector("#main")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
