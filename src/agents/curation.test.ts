import assert from "node:assert/strict";
import test from "node:test";
import { buildCuration } from "./curation";
import { evaluateLocalCorpus } from "./evaluation";
import { readCorpus } from "./ingest";
import { buildGraphPreview } from "./proposals";

test("精读样本的引文、位置、本人确认、阅读路径和发布边界可本地检查", () => {
  const evaluation = evaluateLocalCorpus();
  assert.deepEqual(evaluation.checks.filter((check) => !check.passed), []);
  assert.equal(evaluation.passed, true);
  assert.equal(evaluation.summary.samples, 14);
  assert.equal(evaluation.summary.readingPaths, 3);
  assert.equal(evaluation.summary.externalRequests, 0);
  const inference = buildCuration().samples.find((sample) => sample.id === "working-pattern")!;
  assert.equal(inference.kind, "inferred");
  assert.equal(inference.basis, "analyst_inference");
  assert.equal(inference.reviewStatus, "candidate");
});

test("来源缺失或版本变化时，停用材料样本，不冒用本人确认补证据", () => {
  const documents = readCorpus();
  const research = documents.find((document) => document.kind === "research")!;
  for (const altered of [
    documents.filter((document) => document.id !== research.id),
    documents.map((document) => document.id === research.id ? { ...document, contentHash: "changed" } : document),
    documents.map((document) => document.id === research.id ? { ...document, chunks: [] } : document),
  ]) {
    const curation = buildCuration(altered);
    const sample = curation.samples.find((item) => item.id === "decision-episode")!;
    assert.equal(sample.provenanceStatus, "unavailable");
    assert.deepEqual(sample.evidence, []);
    assert.ok(sample.issues.length);
    assert.equal(curation.samples.find((item) => item.id === "core-direction")?.provenanceStatus, "matched");
    const preview = buildGraphPreview(altered);
    assert.equal(preview.proposals.some((proposal) => proposal.candidateId === "concept.decision-episode"), false);
    assert.ok(preview.proposals.every((proposal) => proposal.evidence.every((evidence) => evidence.sourceType !== "document")));
  }
});
