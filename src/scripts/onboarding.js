/**
 * ONBOARDING ORCHESTRATOR — Interactive Walkthrough & Native Sandbox Guide.
 *
 * Fully client-side, zero libraries. Triggers only for genuine first-time
 * visitors (empty hash + no completion flag); arrivals via a shared
 * workspace link bypass the tour so hydration always wins. Tooltip copy is
 * tagged with data-term so the Multi-Methodology dictionary re-translates
 * it live if the user switches frameworks mid-tour.
 */

import { getState, update } from "./state.js";
import { applyMethodologyLabels } from "./methodology.js";
import { refreshForecastUi } from "./forecast.js";

const $ = (sel) => document.querySelector(sel);

const FLAG = "vibs_onboarding_completed";
const PAD = 10;
const REDUCED = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------------------------------------- */
/* Persistent flag                                                   */
/* ---------------------------------------------------------------- */

function isCompleted() {
  try {
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return true; // storage unavailable — never nag
  }
}

function markCompleted() {
  try {
    localStorage.setItem(FLAG, "1");
  } catch {
    /* noop */
  }
}

/* ---------------------------------------------------------------- */
/* Step definitions                                                  */
/* ---------------------------------------------------------------- */

function loadSampleData() {
  const btn = $("#onboard-action");
  // Never clobber a real workspace: if history already exists (e.g. the
  // tour was launched manually from the header), keep the user's data.
  if (getState().f.hist.length > 0) {
    if (btn) {
      btn.textContent = "✓ Using your existing data";
      btn.disabled = true;
      btn.classList.add("opacity-70");
    }
    return;
  }
  update((d) => {
    d.f.hist = [
      [1, 21],
      [2, 25],
      [3, 18],
      [4, 30],
      [5, 26],
      [6, 32],
    ];
    d.f.backlog = 240;
  });
  refreshForecastUi();
  if (btn) {
    btn.textContent = "✓ Sample data loaded";
    btn.disabled = true;
    btn.classList.add("opacity-70");
  }
}

const STEPS = [
  {
    targets: ['[aria-labelledby="velocity-heading"]'],
    title: "Feed the quantitative engine",
    body: 'This grid is the numeric heart of the sandbox. Real teams drop a CSV export straight from their tracker into the drop-zone — for now, inject six <span data-term="cycle">Sprint</span>s of sample <span data-term="throughput">Velocity</span> and watch the whole dashboard wake up.',
    action: { label: "⚡ Load Sample Data", run: loadSampleData },
  },
  {
    targets: ["#creep-slider"],
    pad: 28,
    title: "Stress-test the delivery date",
    body: 'Drag the Organic Scope Creep Simulator. The Monte Carlo trajectories on the burnup chart re-project instantly — every notch of backlog growth moves your <span data-term="cycle">Sprint</span> milestones in real time.',
  },
  {
    targets: ["#epic-input"],
    pad: 14,
    title: "Translate the messy epic",
    body: 'Paste a sprawling feature idea here. Pick your stack and team seniority above it, and the engine decomposes the concept into an estimated <span data-term="backlog">Product Backlog</span> — with acceptance criteria in your chosen syntax. A local filter scrubs secrets before anything is processed.',
  },
  {
    targets: ["#open-drawer-btn", "#generate-btn"],
    pad: 14,
    title: "Package it for your tracker",
    body: "When the blueprint is ready, the Integration Drawer compiles everything into clean Markdown checklists or a minified JSON array — paste-ready for Jira, Linear, Asana, or Azure DevOps. Your whole workspace also lives in the URL: copy the address bar to share it.",
  },
];

/* ---------------------------------------------------------------- */
/* Positioning engine                                                */
/* ---------------------------------------------------------------- */

let current = -1;
let active = false;
let minimized = false;
let repositionQueued = false;

function findTarget(step) {
  for (const sel of step.targets) {
    const el = document.querySelector(sel);
    if (el && el.getClientRects().length > 0) return el;
  }
  return null;
}

function positionStep() {
  if (!active || minimized || current < 0) return;
  const step = STEPS[current];
  const target = findTarget(step);
  const card = $("#onboard-card");
  if (!target || !card) return;

  const pad = step.pad ?? PAD;
  const r = target.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const hole = {
    top: Math.max(0, r.top - pad),
    left: Math.max(0, r.left - pad),
    right: Math.min(vw, r.right + pad),
    bottom: Math.min(vh, r.bottom + pad),
  };

  const set = (sel, css) => {
    const el = $(sel);
    if (el) Object.assign(el.style, css);
  };
  set("#onboard-mask-top", { top: "0px", left: "0px", width: `${vw}px`, height: `${hole.top}px` });
  set("#onboard-mask-bottom", { top: `${hole.bottom}px`, left: "0px", width: `${vw}px`, height: `${Math.max(0, vh - hole.bottom)}px` });
  set("#onboard-mask-left", { top: `${hole.top}px`, left: "0px", width: `${hole.left}px`, height: `${hole.bottom - hole.top}px` });
  set("#onboard-mask-right", { top: `${hole.top}px`, left: `${hole.right}px`, width: `${Math.max(0, vw - hole.right)}px`, height: `${hole.bottom - hole.top}px` });
  set("#onboard-ring", { top: `${hole.top}px`, left: `${hole.left}px`, width: `${hole.right - hole.left}px`, height: `${hole.bottom - hole.top}px` });

  // Card placement: mobile gets a bottom sheet; desktop glides beside target
  if (vw < 640) {
    Object.assign(card.style, { left: "1rem", right: "1rem", top: "auto", bottom: "1rem" });
    return;
  }
  card.style.right = "auto";
  card.style.bottom = "auto";
  const cw = card.offsetWidth || 384;
  const ch = card.offsetHeight || 220;
  let top = hole.bottom + 14;
  let left = Math.max(14, Math.min(vw - cw - 14, r.left));
  if (top + ch > vh - 14) top = hole.top - ch - 14;
  if (top < 14) {
    // Neither below nor above fits (tall target) — sit beside the hole
    top = Math.max(14, Math.min(vh - ch - 14, hole.top + 8));
    if (hole.right + 14 + cw <= vw - 14) left = hole.right + 14;
    else if (hole.left - 14 - cw >= 14) left = hole.left - cw - 14;
  }
  card.style.top = `${top}px`;
  card.style.left = `${left}px`;
}

function queueReposition() {
  if (repositionQueued) return;
  repositionQueued = true;
  requestAnimationFrame(() => {
    repositionQueued = false;
    positionStep();
  });
}

/* ---------------------------------------------------------------- */
/* Step rendering + flow                                             */
/* ---------------------------------------------------------------- */

function renderDots() {
  const dots = $("#onboard-dots");
  if (!dots) return;
  dots.replaceChildren(
    ...STEPS.map((_, i) => {
      const dot = document.createElement("span");
      dot.className = `h-1.5 rounded-full transition-all duration-300 ${
        i === current ? "w-4 bg-indigo-500" : "w-1.5 bg-slate-300 dark:bg-slate-600"
      }`;
      return dot;
    }),
  );
}

function showStep(index) {
  current = Math.max(0, Math.min(STEPS.length - 1, index));
  const step = STEPS[current];
  const card = $("#onboard-card");
  if (!card) return;

  $("#onboard-step-label").textContent = `Step ${current + 1} of ${STEPS.length}`;
  $("#onboard-title").textContent = step.title;
  $("#onboard-body").innerHTML = step.body;
  applyMethodologyLabels(getState().m); // translate data-term fragments in fresh copy

  const action = $("#onboard-action");
  if (step.action) {
    action.textContent = step.action.label;
    action.disabled = false;
    action.classList.remove("hidden", "opacity-70");
    action.onclick = step.action.run;
  } else {
    action.classList.add("hidden");
    action.onclick = null;
  }

  $("#onboard-back").classList.toggle("invisible", current === 0);
  $("#onboard-next").textContent = current === STEPS.length - 1 ? "Start Planning ✨" : "Next →";
  $("#onboard-badge-label").textContent = `Sandbox guide · ${current + 1}/${STEPS.length}`;
  renderDots();

  const target = findTarget(step);
  target?.scrollIntoView({ behavior: REDUCED() ? "auto" : "smooth", block: "center" });
  // Snap once the scroll settles, and again after layout stabilizes
  setTimeout(positionStep, 100);
  setTimeout(positionStep, 450);
}

function setMinimized(min) {
  minimized = min;
  $("#onboard-root")?.classList.toggle("hidden", min);
  $("#onboard-card")?.classList.toggle("hidden", min);
  $("#onboard-badge-toggle").textContent = min ? "Resume" : "Minimize";
  if (!min) showStep(current);
}

function teardown() {
  active = false;
  $("#onboard-root")?.classList.add("hidden");
  $("#onboard-card")?.classList.add("hidden");
  $("#onboard-badge")?.classList.add("hidden");
  $("#onboard-badge")?.classList.remove("flex");
  window.removeEventListener("resize", queueReposition);
  window.removeEventListener("scroll", queueReposition, true);
}

/* ---------------------------------------------------------------- */
/* Completion celebration — vanilla canvas particle burst            */
/* ---------------------------------------------------------------- */

function celebrate() {
  if (REDUCED()) return;
  const canvas = document.createElement("canvas");
  canvas.className = "pointer-events-none fixed inset-0 z-[70]";
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const colors = ["#6366f1", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7"];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 3;
  const particles = Array.from({ length: 140 }, () => ({
    x: cx,
    y: cy,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 11 - 2,
    size: Math.random() * 7 + 3,
    color: colors[(Math.random() * colors.length) | 0],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    life: 1,
  }));

  let frame = 0;
  const tick = () => {
    frame += 1;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.28;
      p.rot += p.vr;
      p.life = Math.max(0, 1 - frame / 110);
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (frame < 110) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}

/* ---------------------------------------------------------------- */
/* Boot                                                              */
/* ---------------------------------------------------------------- */

function startTour() {
  if (active && !minimized) {
    showStep(0);
    return;
  }
  active = true;
  minimized = false;
  $("#onboard-root")?.classList.remove("hidden");
  $("#onboard-card")?.classList.remove("hidden");
  const badge = $("#onboard-badge");
  badge?.classList.remove("hidden");
  badge?.classList.add("flex");

  $("#onboard-next").onclick = () => {
    if (current === STEPS.length - 1) {
      markCompleted();
      teardown();
      celebrate();
      document.dispatchEvent(
        new CustomEvent("vibsio:toast", {
          detail: { message: "You're set — the sandbox is all yours. Your plan saves itself into the URL." },
        }),
      );
    } else {
      showStep(current + 1);
    }
  };
  $("#onboard-back").onclick = () => showStep(current - 1);
  $("#onboard-badge-toggle").onclick = () => setMinimized(!minimized);
  $("#onboard-badge-dismiss").onclick = () => {
    markCompleted();
    teardown();
  };

  window.addEventListener("resize", queueReposition);
  window.addEventListener("scroll", queueReposition, true);
  showStep(0);
}

/**
 * Entry point — called from app.js AFTER hydration so the trigger can
 * distinguish a genuine first visit ("fresh") from a shared link ("hash")
 * or a returning session ("recovered"), which both bypass the guide.
 */
export function initOnboarding(hydrationSource) {
  // Header launcher: any user, any time, regardless of flags or data.
  $("#tour-launch-btn")?.addEventListener("click", startTour);

  if (hydrationSource !== "fresh" || isCompleted()) return;
  // Idle-defer so the tour never competes with first-paint data rendering
  const start = () => setTimeout(startTour, 400);
  if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 1500 });
  else setTimeout(start, 600);
}
