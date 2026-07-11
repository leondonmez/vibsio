/**
 * MULTI-METHODOLOGY ENGINE — dictionary translation layer.
 *
 * Every methodology-sensitive text fragment in the DOM is tagged with
 * data-term="<key>" (textContent swap) or data-term-ph="<key>" (placeholder
 * swap). Switching methodology re-labels the entire interface on the fly
 * while the underlying state field bindings stay untouched.
 */

export const METHODOLOGIES = {
  scrum: {
    label: "Scrum",
    statuses: ["Backlog", "In Sprint", "Done"],
    terms: {
      board: "Sprint Board",
      backlog: "Product Backlog",
      item: "User Story",
      items: "User Stories",
      cycle: "Sprint",
      lead: "Scrum Master",
      effort: "Story Points",
      throughput: "Velocity",
      addItem: "Add User Story",
      itemPlaceholder: "e.g. As a user, I can share my board via link…",
      boardHint: "Capture user stories, point them, and pull them into the sprint.",
      metricItems: "Stories in Backlog",
      metricEffort: "Total Story Points",
      metricDone: "Sprint Completion",
    },
  },
  kanban: {
    label: "Kanban",
    statuses: ["Queued", "In Progress", "Done"],
    terms: {
      board: "Kanban Board",
      backlog: "Queue",
      item: "Card",
      items: "Cards",
      cycle: "Cycle",
      lead: "Flow Manager",
      effort: "Effort (hrs)",
      throughput: "Throughput",
      addItem: "Add Card",
      itemPlaceholder: "e.g. Wire up the share-link copy button…",
      boardHint: "Visualize flow — limit work in progress and keep cards moving.",
      metricItems: "Cards in Queue",
      metricEffort: "Total Effort Hours",
      metricDone: "Flow Completion",
    },
  },
  pmo: {
    label: "Traditional PMO",
    statuses: ["Planned", "Executing", "Complete"],
    terms: {
      board: "Phase Schedule",
      backlog: "Work Breakdown Structure",
      item: "Task",
      items: "Tasks",
      cycle: "Phase",
      lead: "Project Manager",
      effort: "Estimated Hours",
      throughput: "Milestone Completion",
      addItem: "Add Task",
      itemPlaceholder: "e.g. Finalize vendor contract for phase two…",
      boardHint: "Break the project down into scheduled, estimated work packages.",
      metricItems: "Tasks in WBS",
      metricEffort: "Total Estimated Hours",
      metricDone: "Plan Completion",
    },
  },
};

export function getMethodology(key) {
  return METHODOLOGIES[key] ?? METHODOLOGIES.scrum;
}

/** Re-label every tagged text fragment across the document. */
export function applyMethodologyLabels(key) {
  const dict = getMethodology(key);
  document.querySelectorAll("[data-term]").forEach((el) => {
    const term = dict.terms[el.dataset.term];
    if (term !== undefined) el.textContent = term;
  });
  document.querySelectorAll("[data-term-ph]").forEach((el) => {
    const term = dict.terms[el.dataset.termPh];
    if (term !== undefined) el.setAttribute("placeholder", term);
  });
  // Status <option> labels inside item rows are tagged with data-status-index
  document.querySelectorAll("option[data-status-index]").forEach((opt) => {
    const idx = Number(opt.dataset.statusIndex);
    if (dict.statuses[idx]) opt.textContent = dict.statuses[idx];
  });
}
