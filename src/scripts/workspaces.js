/**
 * WORKSPACE SIDEBAR STORE — zero-configuration local history index.
 *
 * Every active session is upserted into a localStorage index so past
 * blueprints can be listed, renamed, reloaded, or deleted without any
 * account. Each entry carries its own compressed payload, so loading a
 * workspace is just "put its payload in the hash and rehydrate".
 */

import { getAuthProfile } from "./auth.js";

const LS_INDEX = "vibsio:workspaces";
const LS_SESSION_ID = "vibsio:session:id";
const MAX_WORKSPACES = 30;

/**
 * Authenticated users get their workspace history indexed under their
 * Supabase user UUID, so records stay separated per account across
 * sessions on the same machine; guests use the shared local index.
 */
function indexKey() {
  const id = getAuthProfile()?.id;
  return id ? `${LS_INDEX}:${id}` : LS_INDEX;
}

export function currentSessionId() {
  let id = null;
  try {
    id = localStorage.getItem(LS_SESSION_ID);
  } catch {
    /* private mode */
  }
  if (!id) {
    id = crypto.randomUUID();
    try {
      localStorage.setItem(LS_SESSION_ID, id);
    } catch {
      /* noop */
    }
  }
  return id;
}

export function readIndex() {
  try {
    const raw = localStorage.getItem(indexKey());
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter(
      (w) =>
        w !== null &&
        typeof w === "object" &&
        typeof w.id === "string" &&
        typeof w.payload === "string",
    );
  } catch {
    return [];
  }
}

function writeIndex(list) {
  try {
    localStorage.setItem(indexKey(), JSON.stringify(list.slice(0, MAX_WORKSPACES)));
  } catch {
    /* storage full — history is a convenience layer, never fatal */
  }
}

export function upsertWorkspace({ id, name, m, payload }) {
  const rest = readIndex().filter((w) => w.id !== id);
  writeIndex([{ id, name, m, payload, updatedAt: Date.now() }, ...rest]);
}

export function renameWorkspace(id, name) {
  writeIndex(readIndex().map((w) => (w.id === id ? { ...w, name } : w)));
}

export function deleteWorkspace(id) {
  writeIndex(readIndex().filter((w) => w.id !== id));
}

export function setSessionId(id) {
  try {
    localStorage.setItem(LS_SESSION_ID, id);
  } catch {
    /* noop */
  }
}

/** Rotate to a brand-new session id for a fresh blueprint. */
export function rotateSessionId() {
  const id = crypto.randomUUID();
  setSessionId(id);
  return id;
}
