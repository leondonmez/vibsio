/**
 * LAYER 2 — VARIANCE SIMULATION ENGINE.
 * Pure JavaScript statistical utilities: no external packages, no DOM.
 * Everything here is deterministic math (plus a seeded-by-Math.random
 * Monte Carlo sampler) so it can run on every input event without lag.
 */

/** Extract clean positive velocity numbers from [period, velocity] rows. */
export function cleanVelocities(hist) {
  return [...hist]
    .filter((r) => Array.isArray(r) && Number.isFinite(r[1]) && r[1] > 0)
    .sort((a, b) => a[0] - b[0])
    .map((r) => r[1]);
}

/**
 * Three core delivery baselines from the historical velocity array:
 *  - optimistic:  mean of the top-performing third of periods
 *  - expected:    linear recency-weighted rolling average of all periods
 *  - pessimistic: mean of the lowest-performing third of periods
 */
export function scenarioVelocities(velocities) {
  const clean = velocities.filter((v) => Number.isFinite(v) && v > 0);
  if (clean.length === 0) return null;

  const sorted = [...clean].sort((a, b) => b - a);
  const k = Math.max(1, Math.round(sorted.length / 3));
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  let weighted = 0;
  let weightTotal = 0;
  clean.forEach((v, i) => {
    const w = i + 1; // older periods weigh less, recent periods weigh more
    weighted += v * w;
    weightTotal += w;
  });

  return {
    optimistic: avg(sorted.slice(0, k)),
    expected: weighted / weightTotal,
    pessimistic: avg(sorted.slice(-k)),
  };
}

/** Whole periods needed to burn `points` at `velocity` per period. */
export function periodsNeeded(points, velocity) {
  if (!Number.isFinite(velocity) || velocity <= 0) return null;
  if (points <= 0) return 0;
  return Math.ceil(points / velocity);
}

/**
 * Monte Carlo completion sampler: each trial randomly re-draws historical
 * velocities (bootstrap with replacement) until the backlog is exhausted.
 * Returns the p10 / p50 / p90 completion-period percentiles.
 */
export function monteCarlo(velocities, backlog, trials = 1500) {
  const pool = velocities.filter((v) => Number.isFinite(v) && v > 0);
  if (pool.length === 0 || backlog <= 0) return null;

  const results = new Array(trials);
  for (let t = 0; t < trials; t += 1) {
    let remaining = backlog;
    let periods = 0;
    while (remaining > 0 && periods < 1000) {
      remaining -= pool[(Math.random() * pool.length) | 0];
      periods += 1;
    }
    results[t] = periods;
  }
  results.sort((a, b) => a - b);
  const pct = (p) => results[Math.min(trials - 1, Math.floor(p * trials))];
  return { p10: pct(0.1), p50: pct(0.5), p90: pct(0.9) };
}

/**
 * Full forecast assembly: applies the scope-creep multiplier to the
 * remaining backlog, computes the three baselines, projects the three
 * delivery timelines, and attaches Monte Carlo confidence ranges.
 */
export function buildForecast({ hist, backlog, creepPct }) {
  const velocities = cleanVelocities(hist);
  const adjustedBacklog = Math.round(backlog * (1 + creepPct / 100));
  const completedPoints = velocities.reduce((a, b) => a + b, 0);
  const base = {
    adjustedBacklog,
    completedPoints,
    totalScope: completedPoints + adjustedBacklog,
    historyCount: velocities.length,
    ready: false,
  };

  const scen = scenarioVelocities(velocities);
  if (!scen || adjustedBacklog <= 0) return base;

  const mc = monteCarlo(velocities, adjustedBacklog);
  return {
    ...base,
    ready: true,
    scenarios: {
      optimistic: {
        velocity: scen.optimistic,
        periods: periodsNeeded(adjustedBacklog, scen.optimistic),
        mcPeriods: mc?.p10 ?? null,
      },
      expected: {
        velocity: scen.expected,
        periods: periodsNeeded(adjustedBacklog, scen.expected),
        mcPeriods: mc?.p50 ?? null,
      },
      pessimistic: {
        velocity: scen.pessimistic,
        periods: periodsNeeded(adjustedBacklog, scen.pessimistic),
        mcPeriods: mc?.p90 ?? null,
      },
    },
  };
}

/* ---------------------------------------------------------------- */
/* CSV / Excel-export parser                                         */
/* ---------------------------------------------------------------- */

/**
 * Robust text parser for velocity histories exported from Jira, Linear,
 * spreadsheets, etc. Detects the delimiter, finds the velocity column via
 * header keywords (falling back to the right-most mostly-numeric column),
 * strips non-numeric noise, and returns clean [period, velocity] rows.
 */
export function parseVelocityCsv(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const delims = [",", ";", "\t"];
  const counts = delims.map((d) => lines[0].split(d).length);
  const delim = delims[counts.indexOf(Math.max(...counts))];

  const rows = lines.map((l) =>
    l.split(delim).map((c) => c.trim().replace(/^"(.*)"$/, "$1")),
  );

  const toNum = (cell) => {
    const stripped = String(cell ?? "").replace(/[^0-9.+-]/g, "");
    if (!stripped) return null;
    const v = parseFloat(stripped);
    return Number.isFinite(v) ? v : null;
  };

  // Header row: first row containing any non-numeric cell
  let header = null;
  let start = 0;
  if (rows[0].some((c) => toNum(c) === null)) {
    header = rows[0].map((c) => c.toLowerCase());
    start = 1;
  }
  const data = rows.slice(start);
  if (data.length === 0) return [];

  let velCol = -1;
  let perCol = -1;
  if (header) {
    velCol = header.findIndex((h) =>
      /velocity|completed|done|delivered|throughput|achiev/.test(h),
    );
    if (velCol < 0) velCol = header.findIndex((h) => /points|value/.test(h));
    perCol = header.findIndex((h) => /sprint|period|iteration|cycle|phase|week|month|#/.test(h));
    if (perCol === velCol) perCol = -1;
  }
  if (velCol < 0) {
    // Right-most column that is numeric in at least 60% of data rows
    const width = Math.max(...data.map((r) => r.length));
    for (let c = width - 1; c >= 0; c -= 1) {
      const hits = data.filter((r) => toNum(r[c]) !== null).length;
      if (hits >= data.length * 0.6) {
        velCol = c;
        break;
      }
    }
  }
  if (velCol < 0) return [];

  const out = [];
  for (const row of data) {
    const v = toNum(row[velCol]);
    if (v === null || v < 0) continue; // skip noise / subtotal / label rows
    const p = perCol >= 0 ? toNum(row[perCol]) : null;
    out.push([Math.round(p ?? out.length + 1), Math.round(v)]);
  }
  return out.slice(0, 200);
}
