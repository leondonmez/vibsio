/**
 * SERVERLESS API BRIDGE — orchestrate-blueprint Edge Function (Deno).
 *
 * POST /functions/v1/orchestrate-blueprint
 *   1. CORS guard: only vibs.io origins (plus localhost dev) may call.
 *   2. Auth guard: the caller's Supabase Bearer token is verified live
 *      against GoTrue — no valid session, no tokens spent.
 *   3. Schema guard: epic / stack / seniority / syntax / compliance are
 *      validated before anything reaches the model.
 *   4. Prompt compiler: stack profile, seniority style rules, and active
 *      compliance DoD guidelines are injected into one system prompt.
 *   5. True streaming: Anthropic SSE deltas are re-emitted to the browser
 *      as `text/event-stream` tokens with zero server-side buffering.
 *
 * Secrets (server-side only, never shipped to the client):
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-…
 *   (SUPABASE_URL / SUPABASE_ANON_KEY are injected automatically)
 */

const ALLOWED_ORIGINS = new Set([
  "https://vibs.io",
  "https://www.vibs.io",
  "http://localhost:4327",
  "http://localhost:4321",
  "http://localhost:4335",
]);

const STACK_PROFILES: Record<string, string> = {
  "nextjs-supabase":
    "Next.js (App Router, route handlers, React server components) with Supabase (Postgres + RLS policies, Supabase Auth). Deployed on Vercel.",
  "django-postgres":
    "Django + Django REST Framework on PostgreSQL (migrations, models, auth middleware), templated or HTMX views, pytest, Gunicorn/Nginx.",
  "laravel-livewire":
    "Laravel with Livewire components, Eloquent ORM migrations and factories, Sanctum auth, PHPUnit, Forge deployment.",
  "astro-tailwind":
    "Astro static-first architecture with island components, Tailwind CSS, content collections, Vitest + Playwright, CDN deployment.",
  "spring-mysql":
    "Spring Boot REST controllers with JPA entities on MySQL (Flyway migrations), Spring Security, JUnit + Testcontainers, Docker CI.",
};

const SENIORITY_RULES: Record<string, string> = {
  junior:
    "Calibrate for a JUNIOR DEVELOPER: granular tasks, one concern each, include documentation/seed-data/setup tasks, name the files and commands to touch, add pairing or review checkpoints.",
  mid: "Calibrate for a MID-LEVEL ENGINEER: standard-sized tasks with clear boundaries; assume framework fluency but spell out cross-cutting concerns.",
  senior:
    "Calibrate for a SENIOR TECHNICAL LEAD: high-altitude slices, fewer and broader tasks, focus on architecture decisions, risks, and interfaces; omit hand-holding detail.",
};

const VALID_SYNTAX = new Set(["checklist", "bdd"]);

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    Vary: "Origin",
  };
}

function jsonError(status: number, error: string, cors: Record<string, string>): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

interface BlueprintPayload {
  epic: string;
  stack: string;
  seniority: string;
  syntax: string;
  compliance: { labels: string[]; dod: string[]; qaTasks: { t: string; tag: string }[] };
}

function validatePayload(raw: unknown): { payload?: BlueprintPayload; error?: string } {
  if (raw === null || typeof raw !== "object") return { error: "Body must be a JSON object" };
  const p = raw as Record<string, unknown>;
  if (typeof p.epic !== "string" || p.epic.trim().length === 0) {
    return { error: "Field 'epic' (sanitized text body) is required" };
  }
  if (p.epic.length > 8000) return { error: "Field 'epic' exceeds the 8000-character limit" };
  if (typeof p.stack !== "string" || !(p.stack in STACK_PROFILES)) {
    return { error: `Field 'stack' must be one of: ${Object.keys(STACK_PROFILES).join(", ")}` };
  }
  if (typeof p.seniority !== "string" || !(p.seniority in SENIORITY_RULES)) {
    return { error: "Field 'seniority' must be one of: junior, mid, senior" };
  }
  if (typeof p.syntax !== "string" || !VALID_SYNTAX.has(p.syntax)) {
    return { error: "Field 'syntax' must be 'checklist' or 'bdd'" };
  }
  const c = p.compliance as Record<string, unknown> | undefined;
  if (c === null || typeof c !== "object") {
    return { error: "Field 'compliance' (framework profile) is required — send empty arrays when none are active" };
  }
  const compliance = {
    labels: Array.isArray(c.labels) ? c.labels.filter((x) => typeof x === "string").slice(0, 10) : [],
    dod: Array.isArray(c.dod) ? c.dod.filter((x) => typeof x === "string").slice(0, 50) : [],
    qaTasks: [] as { t: string; tag: string }[],
  };
  return {
    payload: {
      epic: p.epic.trim(),
      stack: p.stack,
      seniority: p.seniority,
      syntax: p.syntax,
      compliance,
    },
  };
}

function compileSystemPrompt(p: BlueprintPayload): string {
  const acStyle =
    p.syntax === "bdd"
      ? "Every acceptance criterion MUST use strict BDD form: 'Given <context>, When <action>, Then <outcome>'."
      : "Every acceptance criterion MUST be a concise functional checklist item starting with 'AC:'.";
  const complianceBlock = p.compliance.labels.length
    ? `\nACTIVE COMPLIANCE FRAMEWORKS: ${p.compliance.labels.join(", ")}.
Their Definition-of-Done rules (each generated task must be compatible with these, and you MUST add one dedicated QA task per framework enforcing them):
${p.compliance.dod.map((r) => `- ${r}`).join("\n")}`
    : "";

  return `You are the vibs.io blueprint engine: you decompose a product epic into an actionable engineering plan.

TECHNICAL STACK: ${STACK_PROFILES[p.stack]}
${SENIORITY_RULES[p.seniority]}
${acStyle}${complianceBlock}

OUTPUT PROTOCOL — follow it exactly, no prose, no markdown headings, no numbering:
- One task per line.
- Core implementation tasks:      [CORE] <task> :: <acceptance criterion>
- QA / test tasks:                [QA] <task>
- DevOps / infrastructure tasks:  [DEVOPS] <task>
- UX / UI micro-spec tasks:       [UX] <task>
- Produce 4–7 [CORE] lines and 4–8 extension lines ([QA]/[DEVOPS]/[UX] mixed).
- Use the stack's own vocabulary (framework nouns, file types, commands).
- Never echo credentials, tokens, or personal data from the epic.`;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.has(origin);
  const cors = allowed ? corsHeaders(origin) : corsHeaders("https://vibs.io");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: allowed ? 204 : 403, headers: cors });
  }
  if (!allowed) return jsonError(403, "Origin not allowed", cors);
  if (req.method !== "POST") return jsonError(405, "POST only", cors);

  /* Auth guard — verify the caller's Supabase session live */
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) return jsonError(401, "Missing Bearer token — sign in to use cloud generation", cors);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${bearer}` },
  });
  if (!userRes.ok) return jsonError(401, "Session token was rejected — sign in again", cors);

  /* Schema guard */
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, "Body is not valid JSON", cors);
  }
  const { payload, error } = validatePayload(raw);
  if (!payload) return jsonError(400, error ?? "Invalid payload", cors);

  /* LLM upstream — key lives ONLY in server env */
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return jsonError(503, "LLM provider key not configured on the server yet", cors);
  }
  const model = Deno.env.get("LLM_MODEL") ?? "claude-sonnet-5";

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2500,
      stream: true,
      system: compileSystemPrompt(payload),
      messages: [{ role: "user", content: `EPIC:\n${payload.epic}` }],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 429 ? 429 : 502;
    const detail = upstream.status === 429
      ? "LLM rate limit reached — try again in a moment"
      : `LLM provider error (${upstream.status})`;
    return jsonError(status, detail, cors);
  }

  /* Pass-through SSE: re-emit text deltas token-by-token, unbuffered */
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const evt = JSON.parse(data);
              const text = evt?.delta?.text ?? "";
              if (evt?.type === "content_block_delta" && text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: text })}\n\n`));
              }
              if (evt?.type === "error") {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ error: evt.error?.message ?? "stream error" })}\n\n`),
                );
              }
            } catch {
              /* partial JSON split across chunks — rare; skip the line */
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err).slice(0, 200) })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...cors,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
