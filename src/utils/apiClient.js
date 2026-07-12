/**
 * SERVERLESS API BRIDGE — client-side fetch controller.
 *
 * Vanilla streaming connection to the orchestrate-blueprint Edge Function:
 * attaches the active Supabase session token, reads the text/event-stream
 * response byte-by-byte via ReadableStream + TextDecoder, and hands each
 * token to the caller in real time. When the stream concludes, the parsing
 * utility splits the accumulated text into the editable task-grid shape.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY, getAccessToken } from "../scripts/auth.js";

export const BLUEPRINT_ENDPOINT = `${SUPABASE_URL}/functions/v1/orchestrate-blueprint`;

/**
 * Stream a blueprint generation. `onToken(text)` fires for every raw token
 * as it leaves the model. Resolves with the full accumulated text.
 * Throws with a human-readable message on auth/validation/limit errors.
 */
export async function streamBlueprint(payload, { onToken } = {}) {
  const token = getAccessToken();
  if (!token) throw new Error("no active session — sign in for cloud generation");

  const res = await fetch(BLUEPRINT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    let message = `endpoint returned ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let done = false;

  while (!done) {
    const { done: eof, value } = await reader.read();
    if (eof) break;
    buffer += decoder.decode(value, { stream: true });
    let sep;
    while ((sep = buffer.indexOf("\n\n")) >= 0) {
      const event = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") {
          done = true;
          continue;
        }
        try {
          const evt = JSON.parse(data);
          if (evt.error) throw new Error(evt.error);
          if (evt.t) {
            full += evt.t;
            onToken?.(evt.t);
          }
        } catch (err) {
          if (err instanceof SyntaxError) continue; // malformed frame — skip
          throw err;
        }
      }
    }
  }
  if (!full.trim()) throw new Error("stream ended without content");
  return full;
}

/**
 * Final parsing utility: splits the streamed line protocol
 *   [CORE] task :: acceptance   |   [QA]/[DEVOPS]/[UX] task
 * into the interactive task-grid shape { core: [...], cross: [...] }.
 * Unrecognized lines are ignored, so stray prose can't corrupt the grid.
 */
export function parseBlueprintText(text) {
  const core = [];
  const cross = [];
  const TAGS = { QA: "qa", DEVOPS: "devops", UX: "ux" };

  for (const rawLine of String(text).split("\n")) {
    const line = rawLine.trim().replace(/^[-*]\s+/, "");
    const match = line.match(/^\[?(CORE|QA|DEVOPS|UX)\]?[:\s-]+(.+)$/i);
    if (!match) continue;
    const kind = match[1].toUpperCase();
    const body = match[2].trim().slice(0, 600);
    if (!body) continue;
    const t = body.split(/\s*::\s*/).join("\n");
    if (kind === "CORE") {
      core.push({ id: crypto.randomUUID(), t });
    } else {
      cross.push({ id: crypto.randomUUID(), t, tag: TAGS[kind] });
    }
  }
  return { core: core.slice(0, 60), cross: cross.slice(0, 60) };
}
