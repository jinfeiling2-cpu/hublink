import { applyProposalReviews, readProposalReviews, type ProposalReview } from "./reviews";
import { runCorpusPipeline, type CorpusRunArtifact } from "./orchestrator";

// Resolve against current source versions so an old run cannot keep stale approval alive.
export function buildReadingPreview(base: CorpusRunArtifact = runCorpusPipeline(), reviews: ProposalReview[] = readProposalReviews()) {
  const artifact = applyProposalReviews(base, reviews);
  const proposals = artifact.graphPreview.proposals;
  const nodes = proposals.filter((proposal) => proposal.kind === "node" && proposal.reviewStatus !== "rejected");
  const ids = new Set(nodes.map((proposal) => proposal.candidateId));
  const edges = proposals.filter((proposal) => proposal.kind === "edge" && proposal.reviewStatus !== "rejected"
    && ids.has(proposal.payload.sourceCandidateId) && ids.has(proposal.payload.targetCandidateId));
  return { artifact, nodes, edges, excluded: proposals.length - nodes.length - edges.length };
}
