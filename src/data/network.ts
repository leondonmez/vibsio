/**
 * network.ts — the single source of truth for the vibs.io portfolio.
 *
 * MONOREPO READINESS: To onboard portfolio sites 4 through 10, append a new
 * entry to the NETWORK array below. Everything else (cards, footer links,
 * counters, JSON-LD) is derived from this array — no component edits required.
 */

export interface NetworkSite {
  /** Display name of the property. */
  name: string;
  /** Public production URL, e.g. https://sandboxmax.com */
  url: string;
  /** One-line value proposition, kept punchy for the card and meta usage. */
  description: string;
  /** Short category tag rendered as a pill on the card. */
  tag: string;
  /** Monospace glyph/word shown in the card's launch tile. */
  glyph: string;
  /** 'live' cards link out; 'incoming' cards render as reserved slots. */
  status: 'live' | 'incoming';
}

/**
 * The active flagship network. Order here is the render order on the page.
 */
export const NETWORK: NetworkSite[] = [
  {
    name: 'SandboxMax',
    url: 'https://sandboxmax.com',
    description: 'All-in-one developer sandbox & utility toolkit.',
    tag: 'Dev Toolkit',
    glyph: '{ }',
    status: 'live',
  },
  {
    name: 'CronCrunch',
    url: 'https://croncrunch.dev',
    description: 'Visual cron expression generator and debugger.',
    tag: 'Scheduling',
    glyph: '* *',
    status: 'live',
  },
  {
    name: 'MockDock',
    url: 'https://mockdock.dev',
    description: 'Instant mock API endpoints and JSON hosting.',
    tag: 'API Mocking',
    glyph: '{ } ↯',
    status: 'live',
  },
  {
    name: 'Flexr',
    url: 'https://flexr.dev',
    description: 'CSS Flexbox & Grid layout laboratory.',
    tag: 'CSS Layout',
    glyph: '⧉',
    status: 'live',
  },
];

/**
 * Global site metadata consumed by the base layout for SEO.
 */
export const SITE = {
  name: 'vibs.io',
  legalName: 'Vibsio LLC',
  domain: 'https://vibs.io',
  tagline: 'A digital venture studio for the modern web.',
  // Title kept under 60 chars; branded "vibs.io" per house style (not "Vibsio").
  title: 'vibs.io | Digital Product Studio & Micro-SaaS Foundry',
  // Meta description kept under 155 chars for full SERP display.
  description:
    'vibs.io is an independent digital venture studio and portfolio engine building high-utility web apps — sleek, single-purpose tools shipped fast.',
  keywords: [
    'digital venture studio',
    'micro-saas',
    'developer tools',
    'utility software',
    'indie software studio',
    'vibs.io',
  ],
  ogImage: '/og-image.png',
} as const;

/** Studio operating thesis, rendered in the Philosophy section. */
export const PHILOSOPHY = [
  {
    title: 'Hyper-focused utilities',
    body: 'Every property does one thing exceptionally well. No bloat, no dashboards to learn — just an atomic tool that solves an atomic problem.',
  },
  {
    title: 'Low overhead by design',
    body: 'Static-first, edge-deployed, near-zero infra cost. Lean architecture keeps each product profitable on its own from day one.',
  },
  {
    title: 'Programmatic scaling',
    body: 'Shared design systems and automated pipelines let a single studio operate a growing fleet of independent sites without linear headcount.',
  },
  {
    title: 'Shipped at the speed of thought',
    body: 'Idea to production in days, not quarters. We validate fast, iterate in public, and retire what does not earn its keep.',
  },
] as const;
