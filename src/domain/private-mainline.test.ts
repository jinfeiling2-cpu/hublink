import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkNewTaskAgainstBoundaries, privateMainlineSchema, privateTaskRuleSchema, readPrivateMainline, readPrivateMainlineReviewHistory, savePrivateMainlineReview, savePrivateRelationshipReview } from "./private-mainline";

const localMainlinePath = path.join(process.cwd(), "data", "private-mainline.json");

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
  assert.equal(mainline.relationships[0].kind, "related_to");
  assert.equal(mainline.relationships[0].status, "candidate");
  assert.equal(mainline.relationships[0].privacy, "private");
});

test("typed structural analogies stay private candidates and can carry evidence limits", () => {
  const mainline = privateMainlineSchema.parse({
    version: 1, title: "Synthetic reading", candidateCore: "A tentative core.", reviewStatus: "candidate", ownerNote: "",
    thinkingMethod: [],
    relationships: [{
      title: "SceneNudge and Hublink", kind: "structural_analogy", explanation: "Both select a feasible expression under constraints.",
      state: "ai_interpretation", proposedBy: "ai", status: "candidate", sources: ["fixture:project-a", "fixture:project-b"],
      counterEvidence: ["No evidence establishes intentional method transfer."], validWithin: "Only compare how constraints shape selection.",
      caveat: "Do not infer causation, ownership, or transfer.", privacy: "private",
    }],
    competingHypotheses: [{
      title: "Research-specific method", explanation: "The method may apply only to research analysis.", state: "hypothesis", status: "candidate",
      sources: ["fixture:research-plan"], counterEvidence: [], boundary: "Needs examples outside research.", privacy: "private",
    }],
    readers: [
      { id: "algorithm_recruiter", title: "Recruiter", purpose: "Evaluate evidence.", text: "Example.", sources: [], selected: [], omitted: [], leakageGuard: [], unknowns: [] },
      { id: "deep_personal_reader", title: "Reader", purpose: "Explore interpretation.", text: "Example.", sources: [], selected: [], omitted: [], leakageGuard: [], unknowns: [] },
      { id: "ai_collaborator", title: "AI", purpose: "Understand task boundaries.", text: "Example.", sources: [], selected: [], omitted: [], leakageGuard: [], unknowns: [] },
    ], alignmentArtifacts: [], unresolved: [],
  });
  assert.equal(mainline.relationships[0].kind, "structural_analogy");
  assert.equal(mainline.relationships[0].proposedBy, "ai");
  assert.equal(mainline.relationships[0].status, "candidate");
  assert.equal(mainline.competingHypotheses[0].status, "candidate");
});

test("when present, the local private mainline archive conforms to the private schema", { skip: !fs.existsSync(localMainlinePath) }, () => {
  const archive = privateMainlineSchema.parse(JSON.parse(fs.readFileSync(localMainlinePath, "utf8")));
  assert.equal(archive.reviewStatus, "candidate");
  assert.ok(archive.relationships.every((relationship) => relationship.privacy === "private" && relationship.status !== "owner_confirmed"));
  assert.ok(archive.competingHypotheses.every((hypothesis) => hypothesis.privacy === "private"));
});

test("mainline edits preserve prior candidate and rejection history in a private file", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hublink-mainline-"));
  const reviewPath = path.join(directory, "private-mainline-review.json");
  const baselinePath = path.join(directory, "private-mainline.json");
  fs.writeFileSync(baselinePath, JSON.stringify({
    version: 1, title: "Baseline", candidateCore: "Old candidate wording", reviewStatus: "candidate", ownerNote: "Original owner note.",
    thinkingMethod: [], relationships: [], readers: [
      { id: "algorithm_recruiter", title: "A", purpose: "", text: "", sources: [], selected: [], omitted: [], leakageGuard: [], unknowns: [] },
      { id: "deep_personal_reader", title: "B", purpose: "", text: "", sources: [], selected: [], omitted: [], leakageGuard: [], unknowns: [] },
      { id: "ai_collaborator", title: "C", purpose: "", text: "", sources: [], selected: [], omitted: [], leakageGuard: [], unknowns: [] },
    ], alignmentArtifacts: [], unresolved: [],
  }));
  try {
    savePrivateMainlineReview({ candidateCore: "Revised candidate", reviewStatus: "revise", ownerNote: "Need a counterexample." }, reviewPath, baselinePath);
    savePrivateMainlineReview({ candidateCore: "Rejected candidate", reviewStatus: "rejected", ownerNote: "The scope is too broad." }, reviewPath, baselinePath);
    const history = readPrivateMainlineReviewHistory(reviewPath);
    assert.deepEqual(history.map((item) => [item.candidateCore, item.reviewStatus]), [
      ["Old candidate wording", "candidate"], ["Revised candidate", "revise"],
    ]);
    assert.equal(fs.statSync(reviewPath).mode & 0o777, 0o600);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("owner can confirm, revise, or reject one relationship without changing the core mainline", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hublink-relation-review-"));
  const reviewPath = path.join(directory, "private-mainline-review.json");
  const baselinePath = path.join(directory, "private-mainline.json");
  const baseline = {
    version: 1, title: "Baseline", candidateCore: "Core stays candidate", reviewStatus: "candidate", ownerNote: "",
    thinkingMethod: [], relationships: [{
      title: "SceneNudge and Hublink", kind: "structural_analogy", explanation: "Baseline analogy.", state: "ai_interpretation",
      proposedBy: "ai", status: "candidate", sources: ["fixture:a", "fixture:b"], counterEvidence: [], validWithin: "Selection constraints only.",
      caveat: "No causal claim.", privacy: "private",
    }],
    readers: [
      { id: "algorithm_recruiter", title: "A", purpose: "", text: "", sources: [], selected: [], omitted: [], leakageGuard: [], unknowns: [] },
      { id: "deep_personal_reader", title: "B", purpose: "", text: "", sources: [], selected: [], omitted: [], leakageGuard: [], unknowns: [] },
      { id: "ai_collaborator", title: "C", purpose: "", text: "", sources: [], selected: [], omitted: [], leakageGuard: [], unknowns: [] },
    ], alignmentArtifacts: [], unresolved: [],
  };
  fs.writeFileSync(baselinePath, JSON.stringify(baseline));
  try {
    savePrivateRelationshipReview({ title: "SceneNudge and Hublink", status: "owner_confirmed", explanationOverride: "I intended a limited comparison of constraint-aware selection.", ownerNote: "Do not imply transfer." }, reviewPath, baselinePath);
    savePrivateRelationshipReview({ title: "SceneNudge and Hublink", status: "rejected", explanationOverride: "", ownerNote: "I do not endorse this relation." }, reviewPath, baselinePath);
    const archive = readPrivateMainline(baselinePath, reviewPath);
    assert.equal(archive?.candidateCore, "Core stays candidate");
    assert.equal(archive?.reviewStatus, "candidate");
    assert.equal(archive?.relationships[0].status, "rejected");
    assert.equal(archive?.relationships[0].explanation, "Baseline analogy.");
    assert.equal(archive?.relationships[0].reviewHistory.length, 2);
    assert.equal(archive?.relationships[0].ownerNote, "I do not endorse this relation.");
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
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
