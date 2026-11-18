import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { buildPublicContext } from "@/domain/public-context";
import { analyzeResumeCoverage, resumeDraftContentSchema } from "@/domain/resume-draft";
import { buildResumeProjection } from "@/domain/resume-projection";
import { nodeInputSchema } from "@/domain/schema";
import { resume } from "@/content/profile";
import type { NodeInput } from "@/domain/types";
import {
  createContributionNode,
  createNode,
  createResumeDraft,
  ensureSchema,
  getNode,
  getResumeDraft,
  listEdges,
  listNodes,
  saveResumeDraft,
  setVisibility,
} from "@/db/store";

const emptyNode = (overrides: Partial<NodeInput> = {}): NodeInput => ({
  type: "project", title: "Hublink", summary: "Original project summary", body: "Original source note",
  role: "", outcome: "", status: "exploring", timeStart: "2026-10", timeEnd: null,
  scale: 0, importance: 0, centrality: 0, visibility: "public", primaryUrl: "", exitLinks: [],
  categoryIds: [], sourceKind: "", sourceExternalId: "", sourcePrivate: false, sourceSnapshot: null,
  ...overrides,
});

const contribution = (title: string, marker: string, visibility: "public" | "personal" = "personal") => emptyNode({
  type: "contribution", title, summary: `System fact: ${marker}`, body: `Evidence and owner review: ${marker}`,
  role: "", outcome: "System behavior is locally implemented; personal attribution needs review.",
  visibility, contributionReview: "owner_unconfirmed",
});

function database() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
  return db;
}

function content(projectId: string, contributionId: string, text: string, targetFit: "high" | "medium") {
  return resumeDraftContentSchema.parse({ entries: [{
    sourceNodeId: projectId, kind: "project" as const, title: `Resume ${targetFit}`, role: "待本人核对",
    summary: "Resume-specific summary", timeStart: "2026-10", timeEnd: null,
    sourceRefs: [projectId], targetFit,
    contributions: [{ sourceNodeId: contributionId, text, sourceRefs: [contributionId, "src/domain/graph.ts"], reviewStatus: "owner_unconfirmed" as const, targetFit }],
  }] });
}

test("contribution type validates, persists privately, and links to a project", () => {
  const db = database();
  try {
    const projectId = createNode(emptyNode(), db);
    assert.equal(nodeInputSchema.safeParse({ ...emptyNode({ type: "contribution", visibility: "personal" }), contributionReview: "owner_unconfirmed" }).success, true);
    assert.equal(nodeInputSchema.safeParse({ ...emptyNode({ type: "contribution", visibility: "public" }), contributionReview: "owner_unconfirmed" }).success, false);
    const id = createContributionNode(contribution("Contribution", "SYSTEM_FACT"), projectId, db, "contribution.one");
    const saved = getNode(id, db);
    assert.equal(saved?.type, "contribution");
    assert.equal(saved?.visibility, "personal");
    assert.equal(saved?.contributionReview, "owner_unconfirmed");
    assert.ok(listEdges("all", db).some((edge) => edge.sourceId === id && edge.targetId === projectId && edge.type === "contribution_to"));
    assert.throws(() => setVisibility(id, "public", db), /owner-confirmed/);
    assert.equal(getNode(id, db)?.visibility, "personal");
    assert.throws(() => createContributionNode(contribution("Orphan", "orphan"), "missing", db));
  } finally { db.close(); }
});

test("personal contributions stay out of public graph and context even under a public project", () => {
  const db = database();
  try {
    const projectId = createNode(emptyNode(), db);
    createContributionNode(contribution("Private contribution", "PRIVATE_CONTRIBUTION_MARKER"), projectId, db, "contribution.private");
    const publicNodes = listNodes("public", db);
    assert.equal(publicNodes.some((node) => node.id === "contribution.private"), false);
    const context = buildPublicContext(publicNodes, listEdges("public", db), "http://localhost");
    assert.equal(JSON.stringify(context).includes("PRIVATE_CONTRIBUTION_MARKER"), false);
    assert.equal(JSON.stringify(context).includes("contribution.private"), false);
    assert.equal(JSON.stringify(buildResumeProjection(publicNodes, [])).includes("PRIVATE_CONTRIBUTION_MARKER"), false);
    assert.equal(JSON.stringify(resume).includes("PRIVATE_CONTRIBUTION_MARKER"), false);
  } finally { db.close(); }
});

test("two private drafts can share a project while keeping selections, ordering, and copy independent", () => {
  const db = database();
  try {
    const projectId = createNode(emptyNode(), db);
    const modelId = createContributionNode(contribution("Model", "MODEL_FACT"), projectId, db, "contribution.model");
    const boundaryId = createContributionNode(contribution("Boundary", "BOUNDARY_FACT"), projectId, db, "contribution.boundary");
    const algorithm = content(projectId, modelId, "Algorithm copy", "high");
    algorithm.target = { ...algorithm.target, domain: "LLM agents and spatial intelligence", generalLabel: "Synthetic algorithm internship direction" };
    algorithm.requirements = [{ id: "req.agent", kind: "required_skill", text: "Agent workflow design", evidenceExpectation: "Methods and tested behavior", origin: "general_direction" }];
    algorithm.entries[0].requirementRefs = ["req.agent"];
    algorithm.entries[0].contributions[0].requirementRefs = ["req.agent"];
    const systems = content(projectId, boundaryId, "Systems copy", "medium");
    systems.target = { ...systems.target, domain: "software engineering and system design", generalLabel: "Synthetic software engineering comparison direction" };
    systems.requirements = [{ id: "req.system", kind: "responsibility", text: "Data boundary and persistence design", evidenceExpectation: "Architecture and security evidence", origin: "general_direction" }];
    systems.entries[0].requirementRefs = ["req.system"];
    systems.entries[0].contributions[0].requirementRefs = ["req.system"];
    const algorithmId = createResumeDraft({ title: "Algorithm", targetRole: "Synthetic LLM and spatial intelligence internship direction", content: algorithm }, db);
    const systemsId = createResumeDraft({ title: "Systems", targetRole: "Synthetic software engineering comparison direction", content: systems }, db);
    const reordered = content(projectId, modelId, "Edited resume-only copy", "high");
    reordered.target = algorithm.target;
    reordered.requirements = algorithm.requirements;
    reordered.entries[0].requirementRefs = algorithm.entries[0].requirementRefs;
    reordered.entries[0].contributions[0].requirementRefs = algorithm.entries[0].contributions[0].requirementRefs;
    reordered.entries[0].contributions.unshift({
      sourceNodeId: boundaryId, text: "Second bullet", sourceRefs: [boundaryId], reviewStatus: "owner_unconfirmed", targetFit: "medium", selectionReason: "", requirementRefs: [], variant: "engineering",
    });
    saveResumeDraft({ id: algorithmId, title: "Algorithm v2", targetRole: "Agent engineering", content: reordered }, db);
    const savedAlgorithm = getResumeDraft(algorithmId, db);
    const savedSystems = getResumeDraft(systemsId, db);
    assert.equal(savedAlgorithm?.content.entries[0].contributions[0].text, "Second bullet");
    assert.equal(savedAlgorithm?.content.entries[0].contributions[1].text, "Edited resume-only copy");
    assert.deepEqual(savedSystems?.content.entries[0].contributions.map((item) => item.sourceNodeId), [boundaryId]);
    assert.deepEqual(savedAlgorithm?.content.requirements.map((item) => item.id), ["req.agent"]);
    assert.deepEqual(savedSystems?.content.requirements.map((item) => item.id), ["req.system"]);
    assert.equal(getNode(projectId, db)?.summary, "Original project summary");
    assert.equal(getNode(modelId, db)?.body.includes("MODEL_FACT"), true);
  } finally { db.close(); }
});

test("job requirement coverage is a transparent manual mapping and resume sections retain source review metadata", () => {
  const content = resumeDraftContentSchema.parse({
    entries: [{
      sourceNodeId: "project.test", kind: "project", title: "Resume title", role: "Candidate role", summary: "Resume-only copy",
      timeStart: "2026-01", timeEnd: null, sourceRefs: ["private/source.docx#p12"], targetFit: "high",
      selectionReason: "Directly relevant to the test direction", requirementRefs: ["req.gnn"],
      contributions: [{ sourceNodeId: "contribution.test", text: "Candidate bullet", sourceRefs: ["evidence/research.md#s2"], reviewStatus: "owner_unconfirmed", targetFit: "high", requirementRefs: ["req.gnn"] }],
    }],
    target: { kind: "job_description", company: "Synthetic company", jobDescription: "SYNTHETIC TEST JD", domain: "spatiotemporal modeling", seniority: "intern", location: "", language: "English" },
    requirements: [
      { id: "req.gnn", kind: "required_skill", text: "Spatiotemporal graph modeling", evidenceExpectation: "Research method and validation evidence", origin: "job_description" },
      { id: "req.inferred", kind: "inferred", text: "Explain tradeoffs", evidenceExpectation: "Reasoning and decision evidence", origin: "owner_inference" },
    ],
    sections: { positioning: { text: "Candidate positioning", sourceRefs: ["resume.docx#p1"], reviewStatus: "needs_review" }, skills: [{ text: "Graph learning", sourceRefs: ["resume.docx#p3"], reviewStatus: "candidate" }] },
  });
  const coverage = analyzeResumeCoverage(content);
  assert.deepEqual(coverage.map(({ covered, inferred }) => ({ covered, inferred })), [{ covered: true, inferred: false }, { covered: false, inferred: true }]);
  assert.equal(content.target.generalLabel, "通用方向草稿");
  assert.equal(content.sections.positioning.sourceRefs[0], "resume.docx#p1");
  assert.equal(content.sections.positioning.reviewStatus, "needs_review");
  assert.equal(content.sections.skills[0].reviewStatus, "candidate");
  assert.equal(content.entries[0].contributions[0].reviewStatus, "owner_unconfirmed");
});

test("legacy draft JSON receives safe defaults while complete private sections survive SQLite restore", () => {
  const db = database();
  try {
    const legacy = content("project.legacy", "contribution.legacy", "Unconfirmed wording", "medium");
    const legacyShape = { entries: legacy.entries };
    const upgraded = resumeDraftContentSchema.parse(legacyShape);
    assert.equal(upgraded.target.kind, "general");
    assert.deepEqual(upgraded.requirements, []);

    const full = resumeDraftContentSchema.parse({
      entries: [],
      target: { kind: "general", generalLabel: "Synthetic GNN direction" },
      sections: { education: [{ text: "Candidate degree record", sourceRefs: ["private/resume.docx#p4"], reviewStatus: "needs_review" }] },
      omittedProjectNotes: "SceneNudge omitted pending target-specific evidence mapping.",
    });
    const draftId = createResumeDraft({ title: "Private resume", targetRole: "Synthetic research internship", content: full }, db);
    const restored = getResumeDraft(draftId, db);
    assert.equal(restored?.content.sections.education[0]?.sourceRefs[0], "private/resume.docx#p4");
    assert.equal(restored?.content.sections.education[0]?.reviewStatus, "needs_review");
    assert.equal(restored?.content.omittedProjectNotes, "SceneNudge omitted pending target-specific evidence mapping.");
  } finally { db.close(); }
});

test("draft restore preserves unconfirmed attribution and rejects malformed private draft data", () => {
  const db = database();
  try {
    const projectId = createNode(emptyNode(), db);
    const contributionId = createContributionNode(contribution("Unconfirmed", "OWNER_PENDING"), projectId, db, "contribution.pending");
    const id = createResumeDraft({ title: "Draft", targetRole: "Target", content: content(projectId, contributionId, "Candidate wording", "high") }, db);
    const restored = getResumeDraft(id, db);
    assert.equal(restored?.content.entries[0].contributions[0].reviewStatus, "owner_unconfirmed");
    assert.equal(restored?.content.entries[0].contributions[0].sourceRefs.includes("src/domain/graph.ts"), true);
    assert.equal(resumeDraftContentSchema.safeParse({ entries: [{ privateMarker: "BAD" }] }).success, false);
  } finally { db.close(); }
});
