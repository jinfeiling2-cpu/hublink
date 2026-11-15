import assert from "node:assert/strict";
import test from "node:test";
import { readCorpus } from "./ingest";
import { buildGraphPreview, proposalSummary } from "./proposals";

test("本轮确认会生成带依据的图谱候选，而不是直接写入正式节点", () => {
  const preview = buildGraphPreview();
  const summary = proposalSummary(preview);
  assert.equal(summary.nodes + summary.edges, preview.proposals.length);
  assert.equal(summary.pending, preview.proposals.filter((proposal) => proposal.reviewStatus === "candidate").length);
  assert.ok(preview.proposals.every((proposal) => proposal.reviewStatus === "candidate"));
  assert.ok(preview.proposals.every((proposal) => proposal.evidence.length > 0));
});

test("文档候选保留精确片段，并只引用该片段的陈述", () => {
  const documents = readCorpus();
  const byDocument = new Map(documents.map((document) => [document.id, document]));
  const claims = new Map(documents.flatMap((document) => document.claims).map((claim) => [claim.id, claim]));

  for (const proposal of buildGraphPreview(documents).proposals) {
    const documentEvidence = proposal.evidence.filter((item) => item.sourceType === "document");
    for (const evidence of documentEvidence) {
      const document = byDocument.get(evidence.sourceId);
      assert.ok(document, `missing evidence document ${evidence.sourceId}`);
      const chunk = document?.chunks.find((item) => item.id === evidence.chunkId);
      assert.ok(chunk, `missing evidence chunk ${evidence.chunkId}`);
      assert.equal(chunk?.text.includes(evidence.excerpt), true);
      assert.equal(document?.text.slice(evidence.startOffset, evidence.endOffset), evidence.excerpt);
    }

    const evidenceChunks = new Set(documentEvidence.map((item) => item.chunkId));
    for (const claimId of proposal.claimIds) {
      const claim = claims.get(claimId);
      assert.ok(claim, `missing proposal claim ${claimId}`);
      assert.equal(claim?.chunkIds.some((chunkId) => evidenceChunks.has(chunkId)), true);
    }
  }
});
