/**
 * LAYER 4 — pSEO dictionary: one source of truth drives every
 * /tools/{slug} landing page AND the sitemap compilation script.
 */

export const TOOL_PAGES = [
  {
    slug: "sprint-velocity-calculator",
    title: "Sprint Velocity Calculator — Free, No Sign-Up | vibs.io",
    h1: "Sprint Velocity Calculator",
    description:
      "Calculate your team's sprint velocity from historical data and project realistic delivery dates. Free, in-browser, no account — your data stays in your URL.",
    tagline: "Paste your velocity history, get optimistic, expected, and pessimistic delivery baselines instantly.",
    sections: [
      {
        h2: "How the calculation works",
        body: "Enter each sprint's completed points — or drop a CSV export straight from Jira or a spreadsheet. The engine computes a recency-weighted rolling average for the expected scenario, then brackets it with the mean of your best-performing and worst-performing thirds. No black box: three defensible numbers your stakeholders can interrogate.",
      },
      {
        h2: "Why averages alone mislead",
        body: "A flat average hides variance, and variance is where delivery dates die. That's why the calculator runs a Monte Carlo simulation over your actual history — 1,500 bootstrap trials that answer the question executives really ask: how confident are we in that date?",
      },
    ],
    bullets: [
      "Drag-and-drop CSV import with automatic column detection",
      "Recency-weighted expected velocity, not naive averages",
      "Monte Carlo p10/p50/p90 confidence percentiles",
      "Everything runs in your browser — no data leaves your device",
    ],
  },
  {
    slug: "monte-carlo-project-forecasting",
    title: "Monte Carlo Project Forecasting Tool — Free | vibs.io",
    h1: "Monte Carlo Project Forecasting",
    description:
      "Run Monte Carlo delivery simulations on your real velocity history. Get p10/p50/p90 completion forecasts in seconds — free and fully client-side.",
    tagline: "Stop promising single dates. Start presenting probability ranges backed by your own delivery history.",
    sections: [
      {
        h2: "Bootstrap simulation on your real data",
        body: "Each of 1,500 trials repeatedly re-draws sprints from your actual velocity history until the backlog is exhausted, producing a distribution of completion times rather than a single guess. The 10th, 50th, and 90th percentiles become your best-case, expected, and commitment-safe dates.",
      },
      {
        h2: "Built for the conversation with leadership",
        body: "The output is a burnup chart with three trajectories and clear milestone markers, exportable as a presentation-ready SVG vector. When someone asks 'can we hit Q3?', you answer with a percentage instead of a shrug.",
      },
    ],
    bullets: [
      "1,500-trial bootstrap sampling of your velocity history",
      "p10 / p50 / p90 completion percentiles",
      "Scope-creep stress testing built in",
      "Executive-ready SVG chart export",
    ],
  },
  {
    slug: "burnup-chart-generator",
    title: "Burnup Chart Generator — Free SVG Export | vibs.io",
    h1: "Burnup Chart Generator",
    description:
      "Generate a clean, presentation-ready burnup chart from your sprint data. Live-updating, three forecast trajectories, free SVG download — no login.",
    tagline: "From raw sprint numbers to an executive-ready burnup chart in under a minute.",
    sections: [
      {
        h2: "A real burnup, not a drawing tool",
        body: "The chart plots your actual cumulative delivery against total scope, then projects optimistic, expected, and pessimistic completion trajectories computed from your history. Adjust scope or velocity assumptions and the vectors redraw instantly.",
      },
      {
        h2: "Export that survives the slide deck",
        body: "One click downloads a transparent, self-contained SVG that scales losslessly in PowerPoint, Google Slides, Keynote, or Figma. No watermarks, no raster blur, no sign-up wall in front of your own chart.",
      },
    ],
    bullets: [
      "Live native-SVG rendering — no chart library bloat",
      "Total scope line, target-date marker, three trajectories",
      "Transparent vector export for status decks",
      "Shareable by URL: the whole chart state travels in the link",
    ],
  },
  {
    slug: "scope-creep-simulator",
    title: "Scope Creep Simulator — Model Backlog Growth | vibs.io",
    h1: "Scope Creep Simulator",
    description:
      "Stress-test your delivery date against organic scope growth. Drag a slider from 0–100% backlog inflation and watch the forecast shift in real time.",
    tagline: "Every project grows. See what 15%, 30%, or 50% creep does to your date before you commit to it.",
    sections: [
      {
        h2: "Make creep visible before it happens",
        body: "The simulator multiplies your remaining backlog by an adjustable growth factor and instantly reprojects all three delivery scenarios. It turns 'we'll figure it out' into a number your team can plan around — and a buffer your stakeholders agreed to in advance.",
      },
      {
        h2: "Grounded in your own velocity",
        body: "Creep modeling is only honest when it's applied to real throughput. The simulator runs against your imported velocity history, so the inflated backlog is priced in actual team capacity, not wishful math.",
      },
    ],
    bullets: [
      "0–100% backlog inflation slider with live reprojection",
      "Instant impact on optimistic / expected / pessimistic dates",
      "Combine with Monte Carlo percentiles for commitment-safe buffers",
      "Free, client-side, shareable by URL",
    ],
  },
  {
    slug: "agile-capacity-planning",
    title: "Agile Capacity Planning Tool — FTE & Friction Modeling | vibs.io",
    h1: "Agile Capacity Planning",
    description:
      "Model team-size changes and cross-team dependency friction before they hit your roadmap. Constrained-timeline projection on a live burnup chart.",
    tagline: "What happens to the date if two engineers rotate off and a dependency team gets busy? Now you know.",
    sections: [
      {
        h2: "Resource math, made visual",
        body: "Set your historical FTE baseline, the headcount actually available going forward, and a dependency friction multiplier from 1x to 2x. The tool scales your proven velocity accordingly and draws a dashed Constrained Timeline directly on the burnup chart, next to the unconstrained forecast.",
      },
      {
        h2: "Simulate reorgs without the casualties",
        body: "Because the model runs entirely on historical data plus two sliders, you can war-game hiring plans, team splits, and platform dependencies in minutes — before anyone changes a single assignment in the real tracker.",
      },
    ],
    bullets: [
      "FTE baseline vs. available headcount modeling",
      "Cross-team dependency friction scale (1x–2x)",
      "Dashed constrained-timeline overlay on the live burnup",
      "Monte Carlo re-simulation under constrained throughput",
    ],
  },
  {
    slug: "user-story-generator",
    title: "AI User Story Generator — Epic to Backlog | vibs.io",
    h1: "User Story Generator",
    description:
      "Turn a sprawling epic into a structured, estimated backlog of user stories with acceptance criteria — calibrated to your stack and team seniority.",
    tagline: "Paste the messy idea. Get a segmented task matrix your team can actually sprint on.",
    sections: [
      {
        h2: "Stack-aware decomposition",
        body: "Tell the engine whether you ship on Next.js + Supabase, Django + PostgreSQL, Laravel, Astro, or Spring, and every generated story speaks your architecture's language — routes, migrations, components, and guards named the way your team names them.",
      },
      {
        h2: "Seniority calibration and PII protection",
        body: "Blueprints for junior-heavy teams come more granular, with documentation and seed-data tasks included; senior-lead teams get higher-altitude slices. Before anything is processed, a client-side filter scrubs emails, IP addresses, keys, and tokens out of your input.",
      },
    ],
    bullets: [
      "Epic → core engineering + cross-functional task split",
      "QA, DevOps, and UX extension tasks generated in parallel",
      "Inline editing without regeneration cycles",
      "One-click Markdown or JSON export for Jira, Linear, Asana",
    ],
  },
  {
    slug: "acceptance-criteria-generator",
    title: "Acceptance Criteria Generator — BDD Given-When-Then | vibs.io",
    h1: "Acceptance Criteria Generator",
    description:
      "Generate functional checklists or formal BDD Given-When-Then acceptance criteria for every task in your backlog, automatically and consistently.",
    tagline: "Consistent, testable acceptance criteria on every story — checklist style or strict Given-When-Then.",
    sections: [
      {
        h2: "Two syntaxes, one toggle",
        body: "Flip between pragmatic functional checklists ('AC: works end-to-end and is covered by a test') and formal BDD scenarios ('Given…, When…, Then…') and the entire generated blueprint re-frames its criteria to match. Your QA discipline stays uniform without anyone policing ticket hygiene by hand.",
      },
      {
        h2: "Criteria that inherit your compliance posture",
        body: "Toggle governance profiles like SOC 2, GDPR, HIPAA, or WCAG 2.2 and every generated task inherits matching Definition-of-Done rules and testing protocols — audit trails, erasure tests, contrast checks — injected automatically.",
      },
    ],
    bullets: [
      "Functional checklist or strict Given-When-Then output",
      "Compliance-driven DoD injection (SOC 2, ISO 27001, HIPAA, GDPR, WCAG)",
      "Consistent phrasing across the whole backlog",
      "Copy-paste ready for any tracker",
    ],
  },
  {
    slug: "definition-of-done-generator",
    title: "Definition of Done Generator — Compliance-Ready DoD | vibs.io",
    h1: "Definition of Done Generator",
    description:
      "Build an enterprise-grade Definition of Done from preset compliance frameworks: SOC 2, ISO 27001, HIPAA, GDPR, and WCAG 2.2 accessibility.",
    tagline: "Toggle the frameworks your org answers to; get explicit, auditable DoD criteria on every task.",
    sections: [
      {
        h2: "From regulation to ritual",
        body: "Each framework contributes concrete operational rules — audit-trail logging for SOC 2, right-to-erasure cascades for GDPR, minimum-necessary access for HIPAA, keyboard and contrast checks for WCAG 2.2. Activate a profile once and the criteria attach themselves to everything the blueprint engine produces.",
      },
      {
        h2: "Testing protocols included",
        body: "A Definition of Done without tests is a wish. Every active framework also injects a matching QA protocol task — an axe-core accessibility pass, a residual-data erasure test, a role-based PHI access check — into the cross-functional track of your plan.",
      },
    ],
    bullets: [
      "Five preset frameworks: SOC 2, ISO 27001, HIPAA, GDPR, WCAG 2.2 AA",
      "Explicit DoD rules appended to every generated task",
      "Automatic QA protocol tasks per framework",
      "State travels in your URL — share the governance setup with one link",
    ],
  },
  {
    slug: "kanban-throughput-forecast",
    title: "Kanban Throughput Forecasting Tool — Free | vibs.io",
    h1: "Kanban Throughput Forecast",
    description:
      "Forecast delivery from your Kanban throughput history. Cycle-based projections, Monte Carlo confidence ranges, and a live burnup — no login required.",
    tagline: "Your cards-per-cycle history already knows the delivery date. This tool just asks it politely.",
    sections: [
      {
        h2: "Methodology-native language",
        body: "Switch the workspace to Kanban mode and everything re-labels itself — queues instead of backlogs, throughput instead of velocity, cycles instead of sprints — while the math stays rigorous underneath. No forcing flow metrics through a Scrum-shaped hole.",
      },
      {
        h2: "From queue to quarter",
        body: "Feed in your remaining queue size and historical throughput per cycle, and the engine projects best-case, expected, and worst-case completion windows, stress-testable against scope growth and team capacity changes.",
      },
    ],
    bullets: [
      "Kanban-native terminology across the entire workspace",
      "Throughput history import from CSV exports",
      "Monte Carlo completion percentiles per cycle",
      "Free, client-side, shareable by URL",
    ],
  },
  {
    slug: "project-plan-in-url",
    title: "Share a Project Plan as a URL — No Account Needed | vibs.io",
    h1: "Your Project Plan, In a URL",
    description:
      "vibs.io compresses your entire project plan — backlog, forecasts, blueprints — into the URL itself. Copy the link, share the plan. No accounts, no servers.",
    tagline: "The address bar is the save file. Copy it, Slack it, bookmark it — the whole plan travels with the link.",
    sections: [
      {
        h2: "How data-in-the-URL works",
        body: "Every input in the workspace serializes into one JSON state object, which is deflate-compressed, base64-encoded, and written to the URL fragment in real time. Opening the link on any machine rebuilds the exact workspace — no database ever saw your plan.",
      },
      {
        h2: "Privacy as an architecture, not a policy",
        body: "Because guest data never leaves the browser, there is nothing for a server to leak. Local storage keeps a recovery copy against accidental tab closes, and signing in is only needed for AI generation and cloud backup — never for planning itself.",
      },
    ],
    bullets: [
      "Deflate-compressed state in the URL fragment",
      "Automatic local recovery after refresh or crash",
      "Works offline once loaded — it's all client-side",
      "Optional sign-in only for AI and cloud features",
    ],
  },
];
