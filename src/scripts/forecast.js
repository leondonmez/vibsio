/**
 * LAYER 2 ORCHESTRATOR — binds the forecasting UI to the state engine.
 *
 * - Velocity data-grid rows + drag-and-drop CSV import
 * - Milestone inputs + Organic Scope Creep Simulator slider
 * - Real-time native SVG burnup renderer + .svg export
 *
 * Derived output (summary cards + chart) re-renders through a single
 * requestAnimationFrame gate so slider drags never stack blocking work.
 */

import { getState, update, subscribe } from "./state.js";
import { getMethodology } from "./methodology.js";
import {
  buildForecast,
  parseVelocityCsv,
  constrainForecast,
  constraintFactor,
} from "../utils/forecaster.js";
import { AUTH_STATES, getAuthState } from "./auth.js";

const $ = (sel) => document.querySelector(sel);
const SVG_NS = "http://www.w3.org/2000/svg";
const DAYS_PER_PERIOD = 14; // 2-week cycles for date estimates

/* Colors are literal hex (not theme classes) so the exported SVG is fully
   self-contained and every tone stays legible on light AND dark canvases. */
const COLORS = {
  axis: "#94a3b8",
  text: "#64748b",
  history: "#6366f1",
  scope: "#a855f7",
  target: "#f59e0b",
  optimistic: "#10b981",
  expected: "#3b82f6",
  pessimistic: "#ef4444",
  constrained: "#f97316",
};

/* ================================================================ */
/* DATA GRID                                                         */
/* ================================================================ */

export function renderVelocityGrid() {
  const body = $("#velocity-rows");
  if (!body) return;
  const { hist } = getState().f;
  body.replaceChildren();
  $("#velocity-empty")?.classList.toggle("hidden", hist.length > 0);

  hist.forEach((row, idx) => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100 last:border-0 dark:border-slate-800";

    const mkCell = (value, field, label) => {
      const td = document.createElement("td");
      td.className = "py-1.5 pr-2";
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = "9999";
      input.value = String(value);
      input.setAttribute("aria-label", `${label} for row ${idx + 1}`);
      input.className =
        "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950";
      input.addEventListener("input", () => {
        const v = Math.max(0, Math.min(9999, Math.round(Number(input.value) || 0)));
        update((d) => {
          d.f.hist[idx][field] = v;
        });
      });
      td.append(input);
      return td;
    };

    const tdDel = document.createElement("td");
    tdDel.className = "py-1.5 text-right";
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "✕";
    del.setAttribute("aria-label", `Delete row ${idx + 1}`);
    del.className =
      "rounded-md p-1.5 text-xs text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400";
    del.addEventListener("click", () => {
      update((d) => {
        d.f.hist.splice(idx, 1);
      });
      renderVelocityGrid();
    });
    tdDel.append(del);

    tr.append(mkCell(row[0], 0, "Period number"), mkCell(row[1], 1, "Velocity achieved"), tdDel);
    body.append(tr);
  });
}

function addRow() {
  update((d) => {
    const nextPeriod = d.f.hist.reduce((max, r) => Math.max(max, r[0]), 0) + 1;
    d.f.hist.push([nextPeriod, 0]);
  });
  renderVelocityGrid();
  $("#velocity-rows tr:last-child input")?.focus();
}

/* ---------------- CSV drag-and-drop importer ---------------- */

function importFile(file) {
  if (!file) return;
  if (/\.xlsx?$/i.test(file.name)) {
    toast("Binary Excel workbooks can't be parsed in-browser — export the sheet as CSV first.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseVelocityCsv(reader.result);
    if (rows.length === 0) {
      toast("No numeric velocity data found in that file.");
      return;
    }
    update((d) => {
      d.f.hist = rows;
    });
    renderVelocityGrid();
    toast(`Imported ${rows.length} historical periods from ${file.name}.`);
  };
  reader.readAsText(file);
}

function initDropZone() {
  const zone = $("#csv-dropzone");
  const fileInput = $("#csv-file-input");
  if (!zone || !fileInput) return;

  const setActive = (on) => {
    zone.classList.toggle("border-indigo-400", on);
    zone.classList.toggle("bg-indigo-50", on);
    zone.classList.toggle("dark:bg-indigo-950/40", on);
  };
  ["dragenter", "dragover"].forEach((ev) =>
    zone.addEventListener(ev, (e) => {
      e.preventDefault();
      setActive(true);
    }),
  );
  ["dragleave", "drop"].forEach((ev) =>
    zone.addEventListener(ev, (e) => {
      e.preventDefault();
      setActive(false);
    }),
  );
  zone.addEventListener("drop", (e) => importFile(e.dataTransfer?.files?.[0]));
  zone.addEventListener("click", () => fileInput.click());
  zone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener("change", () => {
    importFile(fileInput.files?.[0]);
    fileInput.value = "";
  });
}

/* ================================================================ */
/* FORECAST CONTROLS                                                 */
/* ================================================================ */

export function pushForecastInputs() {
  const { f } = getState();
  const backlog = $("#backlog-input");
  const target = $("#target-date-input");
  const creep = $("#creep-slider");
  if (backlog && backlog.value !== String(f.backlog)) backlog.value = f.backlog === 0 ? "" : String(f.backlog);
  if (target && target.value !== f.target) target.value = f.target;
  if (creep && creep.value !== String(f.creep)) creep.value = String(f.creep);
  const fteBase = $("#fte-base");
  const fte = $("#fte-count");
  const friction = $("#friction-slider");
  if (fteBase && fteBase.value !== String(f.fteBase)) fteBase.value = String(f.fteBase);
  if (fte && fte.value !== String(f.fte)) fte.value = String(f.fte);
  if (friction && friction.value !== String(f.friction)) friction.value = String(f.friction);
  reflectCreep();
  reflectConstraint();
}

function reflectConstraint() {
  const { f } = getState();
  const out = $("#friction-output");
  if (out) out.textContent = `${f.friction.toFixed(2)}x`;
  const line = $("#constrained-summary");
  if (!line) return;
  const factor = constraintFactor(f);
  if (factor === 1) {
    line.textContent = "Overlay inactive — resources match the historical baseline.";
    line.className = "mt-3 text-xs font-medium text-slate-500 dark:text-slate-400";
  } else {
    line.textContent = `Constraint factor ${factor.toFixed(2)}x — effective throughput ${factor < 1 ? "drops to" : "rises to"} ${(factor * 100).toFixed(0)}% of the historical expected velocity.`;
    line.className = "mt-3 text-xs font-semibold text-orange-600 dark:text-orange-400";
  }
}

/* Guest lock: organizational modeling requires STATE 2+ */
export function renderResourceGate() {
  const lock = $("#resource-lock");
  const controls = $("#resource-controls");
  if (!lock || !controls) return;
  const guest = getAuthState() === AUTH_STATES.GUEST;
  lock.classList.toggle("hidden", !guest);
  lock.classList.toggle("flex", guest);
  controls.disabled = guest;
}

function reflectCreep() {
  const { f } = getState();
  const out = $("#creep-output");
  if (out) out.textContent = `+${f.creep}%`;
  const adjusted = Math.round(f.backlog * (1 + f.creep / 100));
  const line = $("#adjusted-backlog");
  if (line) {
    line.textContent =
      f.backlog > 0
        ? `Simulated total: ${adjusted.toLocaleString()} points (${f.backlog.toLocaleString()} + ${f.creep}% creep buffer)`
        : "Enter the remaining backlog to activate the forecast.";
  }
}

function initControls() {
  $("#backlog-input")?.addEventListener("input", (e) => {
    const v = Math.max(0, Math.min(1_000_000, Math.round(Number(e.target.value) || 0)));
    update((d) => {
      d.f.backlog = v;
    });
    reflectCreep();
  });
  $("#target-date-input")?.addEventListener("input", (e) => {
    update((d) => {
      d.f.target = e.target.value;
    });
  });
  $("#creep-slider")?.addEventListener("input", (e) => {
    const v = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0)));
    update((d) => {
      d.f.creep = v;
    });
    reflectCreep();
  });
  $("#add-velocity-row")?.addEventListener("click", addRow);
  $("#export-svg-btn")?.addEventListener("click", exportSvg);

  // Layer 4 — resource overlay controls
  $("#fte-base")?.addEventListener("input", (e) => {
    const v = Math.max(1, Math.min(500, Math.round(Number(e.target.value) || 1)));
    update((d) => {
      d.f.fteBase = v;
    });
    reflectConstraint();
  });
  $("#fte-count")?.addEventListener("input", (e) => {
    const v = Math.max(1, Math.min(500, Math.round(Number(e.target.value) || 1)));
    update((d) => {
      d.f.fte = v;
    });
    reflectConstraint();
  });
  $("#friction-slider")?.addEventListener("input", (e) => {
    const v = Math.max(1, Math.min(2, Math.round(Number(e.target.value) * 100) / 100));
    update((d) => {
      d.f.friction = v;
    });
    reflectConstraint();
  });
  $("#resource-lock-signin")?.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("vibsio:opengate"));
  });
  document.addEventListener("vibsio:authchange", renderResourceGate);
  renderResourceGate();
}

/* ================================================================ */
/* DERIVED OUTPUT — summary cards + native SVG burnup                */
/* ================================================================ */

function fmtDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function estFinishDate(periods) {
  return new Date(Date.now() + periods * DAYS_PER_PERIOD * 86_400_000);
}

function renderSummary(fc, dict) {
  const defs = [
    ["optimistic", "#scenario-optimistic", "Optimistic"],
    ["expected", "#scenario-expected", "Expected"],
    ["pessimistic", "#scenario-pessimistic", "Pessimistic"],
  ];
  for (const [key, sel] of defs) {
    const card = $(sel);
    if (!card) continue;
    const big = card.querySelector("[data-role=periods]");
    const vel = card.querySelector("[data-role=velocity]");
    const eta = card.querySelector("[data-role=eta]");
    if (!fc.ready) {
      big.textContent = "—";
      vel.textContent = "Awaiting data";
      eta.textContent = "";
      continue;
    }
    const s = fc.scenarios[key];
    big.textContent = `${s.periods} ${dict.terms.cycle}${s.periods === 1 ? "" : "s"}`;
    vel.textContent = `${s.velocity.toFixed(1)} pts / ${dict.terms.cycle.toLowerCase()}`;
    eta.textContent = `≈ ${fmtDate(estFinishDate(s.periods))} · MC p${key === "optimistic" ? "10" : key === "expected" ? "50" : "90"}: ${s.mcPeriods ?? "—"}`;
  }
}

function el(name, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (text !== undefined) node.textContent = text;
  return node;
}

function niceStep(rough) {
  const pow = 10 ** Math.floor(Math.log10(Math.max(rough, 1)));
  for (const mult of [1, 2, 5, 10]) {
    if (rough <= mult * pow) return mult * pow;
  }
  return 10 * pow;
}

function renderChart(fc, dict) {
  const mount = $("#burnup-mount");
  const emptyMsg = $("#burnup-empty");
  if (!mount) return;
  mount.replaceChildren();
  emptyMsg?.classList.toggle("hidden", fc.ready);
  if (!fc.ready) return;

  const { f } = getState();
  const hist = [...f.hist].filter((r) => r[1] > 0).sort((a, b) => a[0] - b[0]);
  const n = hist.length;
  const done = fc.completedPoints;
  const total = fc.totalScope;

  const W = 720;
  const H = 400;
  const M = { t: 28, r: 150, b: 44, l: 60 };
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;

  const worst = fc.scenarios.pessimistic.periods;
  let maxX = Math.max(n + worst + 1, n + 3);
  // Target-date marker (measured in periods from today, appended after history)
  let targetX = null;
  if (f.target) {
    const days = (new Date(f.target + "T00:00:00").getTime() - Date.now()) / 86_400_000;
    if (days > 0) {
      targetX = n + days / DAYS_PER_PERIOD;
      maxX = Math.max(maxX, Math.ceil(targetX) + 1);
    }
  }
  maxX = Math.min(maxX, 400);
  const maxY = total * 1.08;

  const x = (p) => M.l + (p / maxX) * pw;
  const y = (pts) => M.t + ph - (pts / maxY) * ph;

  const svg = el("svg", {
    viewBox: `0 0 ${W} ${H}`,
    role: "img",
    "aria-label": `Burnup forecast: ${dict.terms.cycle}s on the horizontal axis, cumulative points on the vertical axis, with optimistic, expected, and pessimistic delivery trajectories.`,
    "font-family": "ui-sans-serif, system-ui, sans-serif",
    style: "width:100%;height:auto;display:block",
  });

  /* Grid + axes */
  const yStep = niceStep(maxY / 5);
  for (let v = 0; v <= maxY; v += yStep) {
    svg.append(
      el("line", { x1: M.l, y1: y(v), x2: W - M.r, y2: y(v), stroke: COLORS.axis, "stroke-opacity": 0.25 }),
      el("text", { x: M.l - 8, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: COLORS.text }, v.toLocaleString()),
    );
  }
  const xStep = Math.max(1, Math.ceil(maxX / 8));
  for (let p = 0; p <= maxX; p += xStep) {
    svg.append(
      el("text", { x: x(p), y: H - M.b + 18, "text-anchor": "middle", "font-size": 11, fill: COLORS.text }, String(p)),
    );
  }
  svg.append(
    el("line", { x1: M.l, y1: M.t + ph, x2: W - M.r, y2: M.t + ph, stroke: COLORS.axis, "stroke-opacity": 0.6 }),
    el("line", { x1: M.l, y1: M.t, x2: M.l, y2: M.t + ph, stroke: COLORS.axis, "stroke-opacity": 0.6 }),
    el("text", { x: M.l + pw / 2, y: H - 6, "text-anchor": "middle", "font-size": 12, fill: COLORS.text }, `${dict.terms.cycle}s`),
    el("text", { x: 14, y: M.t + ph / 2, "font-size": 12, fill: COLORS.text, transform: `rotate(-90 14 ${M.t + ph / 2})`, "text-anchor": "middle" }, "Cumulative Points"),
  );

  /* Total scope line (label sits left, clear of the termination markers) */
  svg.append(
    el("line", { x1: M.l, y1: y(total), x2: W - M.r, y2: y(total), stroke: COLORS.scope, "stroke-width": 1.5, "stroke-dasharray": "6 4" }),
    el("text", { x: M.l + 6, y: y(total) - 7, "font-size": 11, "font-weight": 600, fill: COLORS.scope }, `Total Scope ${total.toLocaleString()}`),
  );

  /* Target date marker */
  if (targetX !== null && targetX <= maxX) {
    svg.append(
      el("line", { x1: x(targetX), y1: M.t, x2: x(targetX), y2: M.t + ph, stroke: COLORS.target, "stroke-width": 1.5, "stroke-dasharray": "4 4" }),
      el("text", { x: x(targetX), y: M.t - 8, "text-anchor": "middle", "font-size": 11, "font-weight": 600, fill: COLORS.target }, "Target"),
    );
  }

  /* Historical actuals */
  let cum = 0;
  const histPts = [[0, 0], ...hist.map((r) => [null, (cum += r[1])])].map((pt, i) => [i, pt[1]]);
  svg.append(
    el("polyline", {
      points: histPts.map(([p, v]) => `${x(p)},${y(v)}`).join(" "),
      fill: "none",
      stroke: COLORS.history,
      "stroke-width": 2.5,
      "stroke-linejoin": "round",
    }),
  );
  histPts.slice(1).forEach(([p, v]) => svg.append(el("circle", { cx: x(p), cy: y(v), r: 3, fill: COLORS.history })));

  /* Projection trajectories + termination markers */
  const scen = [
    ["optimistic", COLORS.optimistic, "Optimistic"],
    ["expected", COLORS.expected, "Expected"],
    ["pessimistic", COLORS.pessimistic, "Pessimistic"],
  ];
  const markers = [];
  for (const [key, color, label] of scen) {
    const s = fc.scenarios[key];
    const endP = Math.min(n + fc.adjustedBacklog / s.velocity, maxX);
    const endPts = Math.min(done + (endP - n) * s.velocity, total);
    svg.append(
      el("line", { x1: x(n), y1: y(done), x2: x(endP), y2: y(endPts), stroke: color, "stroke-width": 2.5, "stroke-linecap": "round" }),
      el("circle", { cx: x(endP), cy: y(endPts), r: 4, fill: color }),
    );
    markers.push({ x: x(endP) + 8, y: y(endPts) + 4, color, text: `${label} · ${dict.terms.cycle} ${n + s.periods}` });
  }

  /* Layer 4: Constrained Timeline boundary (dashed vector overlay) */
  const constrained = constrainForecast(
    { hist: f.hist, backlog: f.backlog, creepPct: f.creep },
    { fteBase: f.fteBase, fte: f.fte, friction: f.friction },
  );
  if (constrained && constrained.periods !== null) {
    const endP = Math.min(n + fc.adjustedBacklog / constrained.velocity, maxX);
    const endPts = Math.min(done + (endP - n) * constrained.velocity, total);
    svg.append(
      el("line", {
        x1: x(n),
        y1: y(done),
        x2: x(endP),
        y2: y(endPts),
        stroke: COLORS.constrained,
        "stroke-width": 2,
        "stroke-dasharray": "7 5",
        "stroke-linecap": "round",
      }),
      el("circle", { cx: x(endP), cy: y(endPts), r: 4, fill: "none", stroke: COLORS.constrained, "stroke-width": 2 }),
    );
    markers.push({
      x: x(endP) + 8,
      y: y(endPts) + 4,
      color: COLORS.constrained,
      text: `Constrained · ${dict.terms.cycle} ${n + constrained.periods}`,
    });
  }

  // De-collide the termination labels: all trajectories converge on the
  // scope line, so stack any labels closer than 15px vertically.
  markers.sort((a, b) => a.y - b.y);
  markers[0].y -= 10; // lift the first label off the dashed scope line
  for (let i = 1; i < markers.length; i += 1) {
    if (markers[i].y - markers[i - 1].y < 15) markers[i].y = markers[i - 1].y + 15;
  }
  const labelX = Math.max(...markers.map((mk) => mk.x));
  for (const mk of markers) {
    svg.append(el("text", { x: labelX, y: mk.y, "font-size": 11, "font-weight": 600, fill: mk.color }, mk.text));
  }

  mount.append(svg);
}

let rafPending = false;
export function renderForecastDerived() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const { f, m } = getState();
    const dict = getMethodology(m);
    const fc = buildForecast({ hist: f.hist, backlog: f.backlog, creepPct: f.creep });
    renderSummary(fc, dict);
    renderChart(fc, dict);
    reflectCreep();
  });
}

/* ================================================================ */
/* SVG EXPORT                                                        */
/* ================================================================ */

/**
 * Vector compression pass for the exported asset: rounds sub-pixel
 * coordinate noise to 2 decimals, strips comments, and collapses
 * inter-tag whitespace — no visual change, meaningfully smaller file.
 */
function compressSvg(markup) {
  return markup
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/(\d+\.\d{2})\d+/g, "$1")
    .replace(/>\s+</g, "><")
    .trim();
}

function exportSvg() {
  const svg = $("#burnup-mount svg");
  if (!svg) {
    toast("Add velocity history and a backlog first — there is no chart to export yet.");
    return;
  }
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", "720");
  clone.setAttribute("height", "400");
  const blob = new Blob([compressSvg(new XMLSerializer().serializeToString(clone))], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vibsio-burnup-${new Date().toISOString().slice(0, 10)}.svg`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Burnup chart exported as a transparent SVG vector.");
}

function toast(message) {
  document.dispatchEvent(new CustomEvent("vibsio:toast", { detail: { message } }));
}

/* ================================================================ */
/* BOOT                                                              */
/* ================================================================ */

/** Re-sync grid + control inputs after hydration / workspace loads. */
export function refreshForecastUi() {
  pushForecastInputs();
  renderVelocityGrid();
  renderForecastDerived();
}

export function initForecast() {
  initControls();
  initDropZone();
  subscribe(renderForecastDerived);
  refreshForecastUi();
}
