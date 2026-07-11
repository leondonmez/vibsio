/**
 * 3-STATE AUTHENTICATION GUARD — Supabase UI hooks (client-side pipeline).
 *
 * STATE 1  Guest        — no login; secure local sandbox, data lives in the URL.
 * STATE 2  Free user    — Google sign-in complete; cloud-backed workspaces.
 * STATE 3  Premium user — premium flag active; elevated enterprise features.
 *
 * The Supabase project keys are wired below. Until they are set, the
 * "Sign in with Google" trigger surfaces a friendly configuration notice
 * instead of redirecting.
 */

// TODO(config): set once the Supabase project is provisioned.
export const SUPABASE_URL = ""; // e.g. "https://abcd1234.supabase.co"
export const SUPABASE_ANON_KEY = "";

const LS_PROFILE = "vibsio:auth:profile";

export const AUTH_STATES = Object.freeze({
  GUEST: 1,
  FREE: 2,
  PREMIUM: 3,
});

/** Returns the stored profile ({ tier, name, email }) or null for guests. */
export function getAuthProfile() {
  try {
    const raw = localStorage.getItem(LS_PROFILE);
    if (!raw) return null;
    const profile = JSON.parse(raw);
    if (profile === null || typeof profile !== "object" || typeof profile.tier !== "string") {
      return null;
    }
    return profile;
  } catch {
    return null;
  }
}

export function getAuthState() {
  const profile = getAuthProfile();
  if (!profile) return AUTH_STATES.GUEST;
  return profile.tier === "premium" ? AUTH_STATES.PREMIUM : AUTH_STATES.FREE;
}

/**
 * "Sign in with Google" OAuth redirect hook.
 * Maps directly onto Supabase's /auth/v1/authorize endpoint so no SDK
 * download is needed for the redirect leg of the handshake.
 */
export function signInWithGoogle() {
  if (!SUPABASE_URL) {
    document.dispatchEvent(
      new CustomEvent("vibsio:toast", {
        detail: {
          message:
            "Supabase project not configured yet — set SUPABASE_URL in src/scripts/auth.js to enable Google sign-in.",
        },
      }),
    );
    return;
  }
  const redirectTo = encodeURIComponent(window.location.origin + "/");
  window.location.assign(
    `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`,
  );
}

export function signOut() {
  try {
    localStorage.removeItem(LS_PROFILE);
  } catch {
    /* noop */
  }
  document.dispatchEvent(new CustomEvent("vibsio:authchange"));
}
