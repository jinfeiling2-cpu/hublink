import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runCorpusPipeline } from "./orchestrator";
import { applyProposalReviews, proposalFingerprint, readProposalReviews, saveProposalReview } from "./reviews";

test("修改、批准和驳回保留独立历史，重跑不丢审核，来源变化不沿用批准", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hublink-reviews-"));
  try {
    const artifact = runCorpusPipeline();
    const proposal = artifact.graphPreview.proposals.find((item) => item.kind === "node" && item.sourceDocumentIds.length > 0)!;
    const fingerprint = proposalFingerprint(artifact, proposal);
    const form = new FormData();
    form.set("status", "approved");
    form.set("title", "人工修改后的标题");
    saveProposalReview(artifact, proposal.id, fingerprint, form, directory);
    const first = applyProposalReviews(runCorpusPipeline(), readProposalReviews(directory));
    const reviewed = first.graphPreview.proposals.find((item) => item.id === proposal.id)!;
    assert.equal(reviewed.reviewStatus, "approved");
    assert.equal(reviewed.kind === "node" && reviewed.payload.title, "人工修改后的标题");
    assert.equal(artifact.graphPreview.proposals.find((item) => item.id === proposal.id)?.reviewStatus, "candidate");

    form.set("status", "rejected");
    saveProposalReview(artifact, proposal.id, fingerprint, form, directory);
    assert.equal(readProposalReviews(directory).length, 2);
    assert.equal(applyProposalReviews(artifact, readProposalReviews(directory)).graphPreview.proposals.find((item) => item.id === proposal.id)?.reviewStatus, "rejected");

    const changed = structuredClone(artifact);
    changed.documents.find((item) => proposal.sourceDocumentIds.includes(item.id))!.contentHash = "new-content-hash";
    assert.equal(applyProposalReviews(changed, readProposalReviews(directory)).graphPreview.proposals.find((item) => item.id === proposal.id)?.reviewStatus, "candidate");
    assert.throws(() => saveProposalReview(changed, proposal.id, fingerprint, form, directory), /来源已变化/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
