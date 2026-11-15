import assert from "node:assert/strict";
import test from "node:test";
import type { NodeRecord } from "@/domain/types";
import { buildResumeProjection, listResumeCandidates } from "@/domain/resume-projection";

function project(overrides: Partial<NodeRecord> = {}): NodeRecord {
  return {
    id: "project.a",
    type: "project",
    title: "Project A",
    summary: "A public project summary.",
    body: "",
    role: "Contributor",
    outcome: "A documented stage.",
    status: "in_progress",
    timeStart: "2026-01",
    timeEnd: null,
    scale: 0,
    importance: 0,
    centrality: 0,
    visibility: "public",
    primaryUrl: "",
    exitLinks: [],
    sourceKind: "github",
    sourceExternalId: "owner/repo",
    sourcePrivate: false,
    sourceSnapshot: null,
    categoryIds: [],
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

test("resume recommendations exclude private and non-project nodes", () => {
  const nodes = [
    project(),
    project({ id: "project.private", visibility: "personal" }),
    project({ id: "project.private-source", sourcePrivate: true }),
    project({ id: "entry.evidence", type: "entry" }),
  ];
  assert.deepEqual(listResumeCandidates(nodes).map(({ node }) => node.id), ["project.a"]);
});

test("only explicitly selected candidates enter the ordered projection", () => {
  const nodes = [project(), project({ id: "project.b", title: "Project B" })];
  const projection = buildResumeProjection(nodes, [
    { nodeId: "project.b", position: 2, selected: true, reviewedAt: "2026-02-01" },
    { nodeId: "project.a", position: 1, selected: false, reviewedAt: "2026-02-01" },
  ]);
  assert.deepEqual(projection.map(({ node }) => node.id), ["project.b"]);
});

test("projection reflects the current public node fields and omits nodes after visibility changes", () => {
  const choice = [{ nodeId: "project.a", position: 1, selected: true, reviewedAt: "2026-02-01" }];
  const original = buildResumeProjection([project()], choice);
  assert.equal(original[0]?.node.summary, "A public project summary.");

  const updated = buildResumeProjection([project({ summary: "Updated graph summary." })], choice);
  assert.equal(updated[0]?.node.summary, "Updated graph summary.");

  const privateNow = buildResumeProjection([project({ visibility: "personal" })], choice);
  assert.equal(privateNow.length, 0);
});

test("candidate analysis flags missing evidence and never marks candidates selected by score", () => {
  const candidate = listResumeCandidates([project({ role: "", outcome: "", timeStart: null, status: "exploring" })])[0];
  assert.ok(candidate);
  assert.equal(candidate.selected, false);
  assert.ok(candidate.cautions.some((warning) => warning.includes("个人角色")));
  assert.ok(candidate.cautions.some((warning) => warning.includes("结果或阶段")));
  assert.ok(candidate.cautions.some((warning) => warning.includes("时间范围")));
});
