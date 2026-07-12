/**
 * LAYER 4 — CORPORATE COMPLIANCE INJECTION DICTIONARY.
 * Each framework carries explicit operational rules and Definition-of-Done
 * criteria. When toggled active, these are appended to the central state
 * and injected into every Layer 3 generation payload so produced subtasks
 * inherit the matching testing protocols. Pure data + pure functions.
 */

export const COMPLIANCE_PROFILES = {
  soc2: {
    label: "SOC 2 Type II",
    summary: "Continuous evidence of security, availability, and change-control discipline.",
    dod: [
      "Change is linked to a ticket with an auditable approval trail",
      "Access to new resources follows least-privilege role mapping",
      "Logs for the new surface are shipped to the central audit sink",
    ],
    qaTask: "Add an audit-trail test: verify every state-changing action writes an immutable, timestamped log entry with actor identity",
  },
  iso27001: {
    label: "ISO 27001",
    summary: "Information-security management: risk assessment and asset classification.",
    dod: [
      "New data assets are classified and added to the asset register",
      "A risk assessment entry exists for the change with mitigations noted",
      "Secrets touched by the change are stored in the approved vault only",
    ],
    qaTask: "Add a secrets-hygiene test: scan the diff and runtime config to assert no credentials or keys exist outside the approved vault",
  },
  hipaa: {
    label: "HIPAA",
    summary: "Protected health information: encryption, minimum necessary access, BAAs.",
    dod: [
      "PHI fields are encrypted at rest and in transit end-to-end",
      "Access to PHI is limited to the minimum necessary role set",
      "Audit controls record every PHI read/write with user identity",
    ],
    qaTask: "Add a PHI-access test: attempt reads with each non-privileged role and assert denial plus audit-log capture",
  },
  gdpr: {
    label: "GDPR",
    summary: "EU personal data: lawful basis, erasure, portability, and consent.",
    dod: [
      "Personal data fields are documented in the processing register",
      "Right-to-erasure cascades through every store touched by the feature",
      "Consent state is checked before any non-essential processing",
    ],
    qaTask: "Add an erasure test: create a subject, invoke deletion, and assert zero residual personal data across all stores and logs",
  },
  wcag22: {
    label: "WCAG 2.2 AA",
    summary: "Accessibility: keyboard, contrast, focus, and assistive-tech parity.",
    dod: [
      "All interactive elements are keyboard-operable with visible focus",
      "Text and UI contrast meets AA ratios in both themes",
      "Screen-reader labels and roles are verified on new components",
    ],
    qaTask: "Add an accessibility test pass: axe-core scan plus manual keyboard-only walkthrough of the new flow, zero critical violations",
  },
};

export const COMPLIANCE_KEYS = Object.keys(COMPLIANCE_PROFILES);

/**
 * Compile the active frameworks into a structured directives object —
 * attached to Layer 3 payloads and consumed by the synthesizer.
 */
export function activeDirectives(frameworkKeys) {
  const active = frameworkKeys.filter((k) => COMPLIANCE_KEYS.includes(k));
  return {
    labels: active.map((k) => COMPLIANCE_PROFILES[k].label),
    dod: active.flatMap((k) =>
      COMPLIANCE_PROFILES[k].dod.map((rule) => `[${COMPLIANCE_PROFILES[k].label}] ${rule}`),
    ),
    qaTasks: active.map((k) => ({
      t: COMPLIANCE_PROFILES[k].qaTask,
      tag: "qa",
    })),
  };
}
