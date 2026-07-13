/**
 * 3-STATE AUTHENTICATION GUARD — Supabase Google OAuth pipeline (vanilla).
 *
 * STATE 1  Guest        — no login; secure local sandbox, data lives in the URL.
 * STATE 2  Free user    — Google sign-in complete; cloud-backed workspaces.
 * STATE 3  Premium user — premium flag active; elevated enterprise features.
 *
 * Implemented directly against Supabase's GoTrue REST API (implicit flow) —
 * no SDK download. The OAuth callback returns tokens in the URL *hash
 * fragment*, the same real estate our state engine owns, so
 * captureAuthCallback() MUST run before hydrate() to lift the tokens out
 * and clean the address bar; the workspace then restores from its
 * localStorage recovery copy.
 */

export const SUPABASE_URL = "https://dkrizpcahkjaltwesmle.supabase.co";
// Publishable key (successor to the legacy "anon" key) — client-safe by design.
export const SUPABASE_ANON_KEY = "sb_publishable_FI_ImZ29ApKDfKHvFkSD8A_4mJe8Pk4";

const LS_PROFILE = "vibsio:auth:profile";
const LS_SESSION = "vibsio:auth:session";

export const AUTH_STATES = Object.freeze({
  GUEST: 1,
  FREE: 2,
  PREMIUM: 3,
});

/* ---------------------------------------------------------------- */
/* Storage                                                           */
/* ---------------------------------------------------------------- */

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const val = JSON.parse(raw);
    return val !== null && typeof val === "object" ? val : null;
  } catch {
    return null;
  }
}

function writeJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* private mode */
  }
}

function clearKeys() {
  try {
    localStorage.removeItem(LS_PROFILE);
    localStorage.removeItem(LS_SESSION);
  } catch {
    /* noop */
  }
}

/* ---------------------------------------------------------------- */
/* Live auth-state listener (SDK-compatible contract, zero SDK)      */
/* ---------------------------------------------------------------- */

const authListeners = new Set();

/**
 * Vanilla equivalent of supabase.auth.onAuthStateChange:
 * cb(event, profile) fires with "INITIAL_SESSION" | "SIGNED_IN" |
 * "TOKEN_REFRESHED" | "SIGNED_OUT". Returns an unsubscribe function.
 */
export function onAuthStateChange(cb) {
  authListeners.add(cb);
  return () => authListeners.delete(cb);
}

function emitAuth(event) {
  const profile = getAuthProfile();
  for (const cb of authListeners) {
    try {
      cb(event, profile);
    } catch {
      /* one bad listener must not break the chain */
    }
  }
  document.dispatchEvent(new CustomEvent("vibsio:authchange", { detail: { event, profile } }));
}

/* ---------------------------------------------------------------- */
/* Public state readers                                              */
/* ---------------------------------------------------------------- */

/** Returns the stored profile ({ tier, name, email, avatar }) or null. */
export function getAuthProfile() {
  const profile = readJson(LS_PROFILE);
  return profile && typeof profile.tier === "string" ? profile : null;
}

export function getAuthState() {
  const profile = getAuthProfile();
  if (!profile) return AUTH_STATES.GUEST;
  return profile.tier === "premium" ? AUTH_STATES.PREMIUM : AUTH_STATES.FREE;
}

/** Current access token for authenticated API calls (or null). */
export function getAccessToken() {
  return readJson(LS_SESSION)?.access_token ?? null;
}

/* ---------------------------------------------------------------- */
/* Sign-in / sign-out                                                */
/* ---------------------------------------------------------------- */

/** "Sign in with Google" — implicit-flow redirect via GoTrue /authorize. */
export function signInWithGoogle() {
  if (!SUPABASE_URL) {
    toast("Supabase project not configured yet — set SUPABASE_URL in src/scripts/auth.js.");
    return;
  }
  // Carry the full current URL — including the compressed workspace hash —
  // so Supabase drops the user back at their fully populated blueprint.
  const returnUrl = window.location.origin + window.location.pathname + window.location.hash;
  const redirectTo = encodeURIComponent(returnUrl);
  window.location.assign(
    `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`,
  );
}

export async function signOut() {
  const token = getAccessToken();
  clearTimeout(refreshTimer);
  clearKeys();
  emitAuth("SIGNED_OUT");
  if (token) {
    // Best-effort server-side revocation — local sign-out already happened.
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      });
    } catch {
      /* offline — token simply expires server-side */
    }
  }
}

/* ---------------------------------------------------------------- */
/* OAuth callback capture (runs BEFORE the state engine hydrates)    */
/* ---------------------------------------------------------------- */

export async function captureAuthCallback() {
  const fragment = location.hash.slice(1);
  const marker = fragment.match(/(^|[#&])(access_token|error)=/);
  if (!marker) return false;

  // The fragment may lead with the preserved workspace payload (redirect_to
  // carried the hash), then the token params appended by Supabase after a
  // `#` or `&`. Split them: restore the workspace hash, lift out the tokens.
  const workspacePart = fragment.slice(0, marker.index);
  const tokenPart = fragment.slice(marker.index + marker[1].length);
  const cleanHash =
    workspacePart.startsWith("w1:") || workspacePart.startsWith("w0:") ? "#" + workspacePart : "";
  history.replaceState(null, "", location.pathname + location.search + cleanHash);
  const params = new URLSearchParams(tokenPart);

  if (params.get("error")) {
    toast(`Sign-in was cancelled or failed: ${params.get("error_description") ?? params.get("error")}`);
    return false;
  }

  const session = {
    access_token: params.get("access_token") ?? "",
    refresh_token: params.get("refresh_token") ?? "",
    expires_at: Date.now() + (Number(params.get("expires_in")) || 3600) * 1000,
  };
  if (!session.access_token) return false;

  const user = await fetchUser(session.access_token);
  if (!user) {
    toast("Sign-in could not be completed — the session token was rejected.");
    return false;
  }

  writeJson(LS_SESSION, session);
  writeJson(LS_PROFILE, profileFromUser(user));
  scheduleRefresh(session);
  emitAuth("SIGNED_IN");
  toast(`Signed in as ${profileFromUser(user).name} — cloud features unlocked.`);
  return true;
}

function profileFromUser(user) {
  const md = user.user_metadata ?? {};
  return {
    // TODO(step 2): read the premium flag from the `profiles` table
    tier: "free",
    id: user.id,
    name: md.full_name || md.name || (user.email ?? "").split("@")[0] || "Signed in",
    email: user.email ?? "",
    avatar: md.avatar_url || md.picture || "",
  };
}

async function fetchUser(token) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- */
/* Session freshness — refresh ~1 min before expiry                  */
/* ---------------------------------------------------------------- */

let refreshTimer = 0;

function scheduleRefresh(session) {
  clearTimeout(refreshTimer);
  const inMs = Math.max(30_000, session.expires_at - Date.now() - 60_000);
  refreshTimer = setTimeout(() => refreshSession(session), inMs);
}

async function refreshSession(session) {
  if (!session.refresh_token) {
    await signOut();
    return null;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const next = {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? session.refresh_token,
      expires_at: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    };
    writeJson(LS_SESSION, next);
    scheduleRefresh(next);
    emitAuth("TOKEN_REFRESHED");
    return next;
  } catch {
    await signOut();
    toast("Your session expired — sign in again to keep cloud features.");
    return null;
  }
}

/** Validate/refresh the stored session on page load. */
export async function ensureFreshSession() {
  const session = readJson(LS_SESSION);
  if (!session?.access_token) {
    // A profile without a session is stale (e.g. cleared elsewhere) — drop it.
    if (getAuthProfile()) {
      clearKeys();
      emitAuth("SIGNED_OUT");
    }
    return null;
  }
  if (Date.now() < session.expires_at - 60_000) {
    scheduleRefresh(session);
    emitAuth("INITIAL_SESSION");
    return session;
  }
  return refreshSession(session);
}

function toast(message) {
  document.dispatchEvent(new CustomEvent("vibsio:toast", { detail: { message } }));
}
