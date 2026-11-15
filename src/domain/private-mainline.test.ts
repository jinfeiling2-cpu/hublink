import assert from "node:assert/strict";
import test from "node:test";
import { checkNewTaskAgainstBoundaries, privateMainlineSchema, privateTaskRuleSchema } from "./private-mainline";

test("private mainline schema distinguishes candidate, owner review, evidence, and reader profiles", () => {
  const mainline = privateMainlineSchema.parse({
    version: 1,
    title: "Synthetic private reading",
    candidateCore: "A testable interpretation based on local evidence.",
    reviewStatus: "candidate",
    ownerNote: "Needs review.",
    thinkingMethod: [{ text: "Check constraints before choosing an action.", state: "ai_interpretation", sources: ["fixture:1"], boundary: "Example only." }],
    relationships: [{ title: "Example relation", explanation: "Two examples share a constraint-aware method.", state: "ai_interpretation", sources: ["fixture:1"], caveat: "Not a causal claim." }],
    readers: [
      { id: "algorithm_recruiter", title: "Recruiter", purpose: "Evaluate evidence.", text: "Example.", sources: [], selected: [], omitted: [], leakageGuard: [], unknowns: [] },
      { id: "deep_personal_reader", title: "Reader", purpose: "Explore interpretation.", text: "Example.", sources: [], selected: [], omitted: [], leakageGuard: [], unknowns: [] },
      { id: "ai_collaborator", title: "AI", purpose: "Understand task boundaries.", text: "Example.", sources: [], selected: [], omitted: [], leakageGuard: [], unknowns: [] },
    ],
    alignmentArtifacts: [],
    unresolved: [],
  });
  assert.equal(mainline.reviewStatus, "candidate");
  assert.equal(mainline.relationships[0].state, "ai_interpretation");
  assert.equal(mainline.readers.length, 3);
});

test("task boundary rules warn on configured conflicts and never auto-approve a task", () => {
  const rules = [privateTaskRuleSchema.parse({
    id: "synthetic-boundary",
    patterns: ["future goal", "replace current task"],
    warning: "A future goal may conflict with the current task; owner review is required.",
  })];
  const conflict = checkNewTaskAgainstBoundaries("Use a future goal to replace current task", rules);
  assert.deepEqual(conflict.warnings, [rules[0].warning]);
  const noMatch = checkNewTaskAgainstBoundaries("Organize project evidence", rules);
  assert.deepEqual(noMatch.warnings, []);
});
