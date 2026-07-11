/**
 * CORE STATE LAYER — "The Data is in the URL Hash."
 *
 * One unified JSON state object holds every interactive parameter of the
 * workspace. It is deflate-compressed, base64url-encoded, and written to
 * window.location.hash in real time. On load the hash is decoded, integrity-
 * checked, and used to rehydrate the entire UI. localStorage mirrors the same
 * payload as a crash/refresh recovery fallback — no account required.
 *
 * Payload format:  #w1:<base64url deflate-raw JSON>   (compressed)
 *                  #w0:<base64url JSON>               (fallback, no CompressionStream)
 */

const PREFIX_DEFLATE = "w1:";
const PREFIX_PLAIN = "w0:";
const LS_CURRENT = "vibsio:session:current";

export const METHODOLOGY_KEYS = ["scrum", "kanban", "pmo"];

export const DEFAULT_STATE = Object.freeze({
  v: 1,
  name: "Untitled Blueprint",
  m: "scrum",
  p: { title: "", objective: "", start: "", owner: "" },
  items: [],
});

let state = structuredClone(DEFAULT_STATE);
const listeners = new Set();

export function getState() {
  return state;
}

/** Subscribe to state changes. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Mutate state through a draft and notify subscribers + schedule hash sync. */
export function update(mutator) {
  const draft = structuredClone(state);
  mutator(draft);
  state = draft;
  for (const fn of listeners) fn(state);
  scheduleSync();
}

/** Replace the whole state (used by hydration and workspace loads). */
export function replaceState(next, { sync = true } = {}) {
  state = normalize(next);
  for (const fn of listeners) fn(state);
  if (sync) scheduleSync();
}

/* ---------------------------------------------------------------- */
/* Serialization: JSON -> deflate -> base64url                       */
/* ---------------------------------------------------------------- */

function toB64Url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromB64Url(str) {
  const b64 = str.replaceAll("-", "+").replaceAll("_", "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64 + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipeThrough(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function serializeState(source = state) {
  const json = JSON.stringify(source);
  const raw = new TextEncoder().encode(json);
  if (typeof CompressionStream !== "undefined") {
    const packed = await pipeThrough(raw, new CompressionStream("deflate-raw"));
    return PREFIX_DEFLATE + toB64Url(packed);
  }
  return PREFIX_PLAIN + toB64Url(raw);
}

export async function deserializePayload(payload) {
  if (!payload) return null;
  try {
    let json;
    if (payload.startsWith(PREFIX_DEFLATE)) {
      if (typeof DecompressionStream === "undefined") return null;
      const bytes = fromB64Url(payload.slice(PREFIX_DEFLATE.length));
      const raw = await pipeThrough(bytes, new DecompressionStream("deflate-raw"));
      json = new TextDecoder().decode(raw);
    } else if (payload.startsWith(PREFIX_PLAIN)) {
      json = new TextDecoder().decode(fromB64Url(payload.slice(PREFIX_PLAIN.length)));
    } else {
      return null;
    }
    const parsed = JSON.parse(json);
    return isValidState(parsed) ? normalize(parsed) : null;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- */
/* Structural integrity                                              */
/* ---------------------------------------------------------------- */

function isValidState(obj) {
  return (
    obj !== null &&
    typeof obj === "object" &&
    obj.v === 1 &&
    typeof obj.name === "string" &&
    METHODOLOGY_KEYS.includes(obj.m) &&
    obj.p !== null &&
    typeof obj.p === "object" &&
    Array.isArray(obj.items)
  );
}

function normalize(obj) {
  return {
    v: 1,
    name: String(obj.name ?? DEFAULT_STATE.name).slice(0, 120),
    m: METHODOLOGY_KEYS.includes(obj.m) ? obj.m : "scrum",
    p: {
      title: String(obj.p?.title ?? "").slice(0, 200),
      objective: String(obj.p?.objective ?? "").slice(0, 2000),
      start: String(obj.p?.start ?? "").slice(0, 10),
      owner: String(obj.p?.owner ?? "").slice(0, 120),
    },
    items: obj.items
      .filter((it) => it !== null && typeof it === "object" && typeof it.t === "string")
      .slice(0, 500)
      .map((it) => ({
        id: typeof it.id === "string" ? it.id : crypto.randomUUID(),
        t: it.t.slice(0, 200),
        s: [0, 1, 2].includes(it.s) ? it.s : 0,
        e: Number.isFinite(it.e) && it.e >= 0 ? Math.min(it.e, 9999) : 0,
      })),
  };
}

/* ---------------------------------------------------------------- */
/* Real-time sync: hash + localStorage fallback                      */
/* ---------------------------------------------------------------- */

let syncTimer = 0;

function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 150);
}

export async function syncNow() {
  const payload = await serializeState();
  // replaceState avoids flooding browser history with every keystroke
  history.replaceState(null, "", "#" + payload);
  try {
    localStorage.setItem(LS_CURRENT, payload);
  } catch {
    /* storage full or unavailable — the hash itself remains the source of truth */
  }
  document.dispatchEvent(new CustomEvent("vibsio:synced", { detail: { payload } }));
  return payload;
}

/**
 * Hydration order: URL hash wins (shared/bookmarked links), then the
 * localStorage recovery copy, then a fresh default workspace.
 */
export async function hydrate() {
  const hashPayload = location.hash.length > 1 ? location.hash.slice(1) : "";
  const fromHash = await deserializePayload(hashPayload);
  if (fromHash) {
    state = fromHash;
    return "hash";
  }
  let stored = "";
  try {
    stored = localStorage.getItem(LS_CURRENT) ?? "";
  } catch {
    /* private mode */
  }
  const fromLocal = await deserializePayload(stored);
  if (fromLocal) {
    state = fromLocal;
    await syncNow();
    return "recovered";
  }
  state = structuredClone(DEFAULT_STATE);
  return "fresh";
}

export function clearCurrentSession() {
  try {
    localStorage.removeItem(LS_CURRENT);
  } catch {
    /* noop */
  }
}
