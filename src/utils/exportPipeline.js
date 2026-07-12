/**
 * LAYER 4 — LIVE THIRD-PARTY EXPORT PIPELINE (Jira Cloud + Linear).
 *
 * CRITICAL SECURITY RULE: credentials live ONLY in this browser's
 * localStorage under a dedicated key that the Layer 1 state engine never
 * reads — tokens can never leak into the compressed URL hash, and they are
 * transmitted exclusively to the provider's own API endpoint, never to any
 * vibs.io backend or logger.
 */

const LS_INTEGRATIONS = "vibsio:integrations";

/* ---------------------------------------------------------------- */
/* Credential vault (browser-local, base64-wrapped, never hash-synced)*/
/* ---------------------------------------------------------------- */

export function readIntegrations() {
  try {
    const raw = localStorage.getItem(LS_INTEGRATIONS);
    if (!raw) return { jira: null, linear: null };
    const parsed = JSON.parse(atob(raw));
    return {
      jira: parsed?.jira && typeof parsed.jira === "object" ? parsed.jira : null,
      linear: parsed?.linear && typeof parsed.linear === "object" ? parsed.linear : null,
    };
  } catch {
    return { jira: null, linear: null };
  }
}

export function writeIntegrations(next) {
  try {
    localStorage.setItem(LS_INTEGRATIONS, btoa(JSON.stringify(next)));
  } catch {
    /* storage unavailable — user keeps working, tokens just aren't saved */
  }
}

export function clearIntegrations() {
  try {
    localStorage.removeItem(LS_INTEGRATIONS);
  } catch {
    /* noop */
  }
}

/* ---------------------------------------------------------------- */
/* Jira Cloud — REST v3 bulk issue creation                          */
/* ---------------------------------------------------------------- */

function jiraDescriptionAdf(lines) {
  return {
    type: "doc",
    version: 1,
    content: lines.map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    })),
  };
}

async function publishToJira(config, tasks, meta) {
  const base = config.baseUrl.replace(/\/+$/, "");
  const auth = btoa(`${config.email}:${config.token}`);
  const issueUpdates = tasks.map((task) => {
    const [summary, ...rest] = task.text.split("\n");
    return {
      fields: {
        project: { key: config.projectKey },
        issuetype: { name: "Task" },
        summary: summary.slice(0, 250),
        description: jiraDescriptionAdf(rest.length ? rest : ["Imported from vibs.io"]),
        labels: ["vibsio", task.track, task.tag].filter(Boolean),
      },
    };
  });

  const res = await fetch(`${base}/rest/api/3/issue/bulk`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ issueUpdates }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Jira responded ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    created: (data.issues ?? []).map((i) => ({ id: i.key, url: `${base}/browse/${i.key}` })),
    failed: (data.errors ?? []).map((e) => ({
      title: tasks[e.failedElementNumber]?.text.split("\n")[0] ?? "unknown",
      error: JSON.stringify(e.elementErrors?.errors ?? e).slice(0, 200),
    })),
  };
}

/* ---------------------------------------------------------------- */
/* Linear — GraphQL issueCreate                                      */
/* ---------------------------------------------------------------- */

async function publishToLinear(config, tasks, meta, onProgress) {
  const created = [];
  const failed = [];
  for (const [idx, task] of tasks.entries()) {
    const [title, ...rest] = task.text.split("\n");
    const description = [
      ...rest,
      "",
      `_Imported from vibs.io · ${meta.blueprint} · track: ${task.track} · ${task.tag ?? "eng"}_`,
    ].join("\n");
    try {
      const res = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          Authorization: config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `mutation IssueCreate($input: IssueCreateInput!) {
            issueCreate(input: $input) { success issue { identifier url } }
          }`,
          variables: {
            input: { teamId: config.teamId, title: title.slice(0, 250), description },
          },
        }),
      });
      const data = await res.json();
      const issue = data?.data?.issueCreate?.issue;
      if (issue) created.push({ id: issue.identifier, url: issue.url });
      else {
        failed.push({
          title,
          error: (data?.errors?.[0]?.message ?? `Linear responded ${res.status}`).slice(0, 200),
        });
      }
    } catch (err) {
      failed.push({ title, error: describeNetworkError(err) });
    }
    onProgress?.(idx + 1, tasks.length);
  }
  return { created, failed };
}

/* ---------------------------------------------------------------- */
/* Unified entry point                                               */
/* ---------------------------------------------------------------- */

function describeNetworkError(err) {
  if (err instanceof TypeError) {
    return "Request blocked before reaching the API (browser CORS policy). This provider requires a server-side relay — planned for the /api layer.";
  }
  return String(err?.message ?? err).slice(0, 200);
}

/**
 * Publish the Layer 3 task matrix to a live tracker in one click.
 * `target` is "jira" | "linear"; task objects: { text, track, tag }.
 */
export async function publishBlueprint({ target, tasks, meta, onProgress }) {
  const { jira, linear } = readIntegrations();
  if (tasks.length === 0) {
    return { ok: false, created: [], failed: [], error: "No generated tasks to publish — run the Blueprint Engine first." };
  }
  try {
    if (target === "jira") {
      if (!jira?.baseUrl || !jira?.email || !jira?.token || !jira?.projectKey) {
        return { ok: false, created: [], failed: [], error: "Jira configuration is incomplete — fill all four fields and save." };
      }
      const result = await publishToJira(jira, tasks, meta);
      return { ok: result.failed.length === 0, ...result };
    }
    if (target === "linear") {
      if (!linear?.apiKey || !linear?.teamId) {
        return { ok: false, created: [], failed: [], error: "Linear configuration is incomplete — API key and team ID are required." };
      }
      const result = await publishToLinear(linear, tasks, meta, onProgress);
      return { ok: result.failed.length === 0, ...result };
    }
    return { ok: false, created: [], failed: [], error: `Unknown target: ${target}` };
  } catch (err) {
    return { ok: false, created: [], failed: [], error: describeNetworkError(err) };
  }
}
