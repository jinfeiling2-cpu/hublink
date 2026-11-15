import assert from "node:assert/strict";
import test from "node:test";
import { runCorpusPipeline } from "./orchestrator";
import { proposalFingerprint, type ProposalReview } from "./reviews";
import { buildReadingPreview } from "./reading-preview";

test("阅读预览应用有效修改，并排除驳回节点及其悬空连接", () => {
  const artifact = runCorpusPipeline();
  const node = artifact.graphPreview.proposals.find((proposal) => proposal.kind === "node")!;
  const edge = artifact.graphPreview.proposals.find((proposal) => proposal.kind === "edge")!;
  assert.equal(node.kind, "node");
  const reviews: ProposalReview[] = [{
    id: "review-edit", proposalId: node.id, baseFingerprint: proposalFingerprint(artifact, node),
    reviewedAt: "2026-11-02T00:00:00.000Z", reviewer: "local-admin",
    proposal: { ...node, reviewStatus: "approved", payload: { ...node.payload, summary: "预览中的已审核摘要" } },
  }, {
    id: "review-reject", proposalId: edge.id, baseFingerprint: proposalFingerprint(artifact, edge),
    reviewedAt: "2026-11-02T00:01:00.000Z", reviewer: "local-admin",
    proposal: { ...edge, reviewStatus: "rejected" },
  }];
  const preview = buildReadingPreview(artifact, reviews);
  const edited = preview.nodes.find((proposal) => proposal.id === node.id);
  assert.equal(edited?.kind === "node" && edited.payload.summary, "预览中的已审核摘要");
  assert.equal(edited?.reviewStatus, "approved");
  assert.equal(preview.edges.some((proposal) => proposal.id === edge.id), false);

  reviews.push({ ...reviews[0], id: "review-reject-node", proposal: { ...node, reviewStatus: "rejected" } });
  const rejected = buildReadingPreview(artifact, reviews);
  assert.equal(rejected.nodes.some((proposal) => proposal.id === node.id), false);
  assert.ok(rejected.edges.every((proposal) => proposal.kind !== "edge"
    || (proposal.payload.sourceCandidateId !== node.candidateId && proposal.payload.targetCandidateId !== node.candidateId)));

  const stale = structuredClone(artifact);
  stale.graphPreview.version += "-changed";
  const reset = buildReadingPreview(stale, reviews);
  assert.equal(reset.nodes.find((proposal) => proposal.id === node.id)?.reviewStatus, "candidate");
});
