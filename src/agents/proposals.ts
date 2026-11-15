import fs from "node:fs";
import path from "node:path";
import { ownerConfirmationId, ownerConfirmations } from "./confirmed";
import { readCorpus, type CorpusDocument } from "./ingest";
import { graphPreviewSchema, type GraphPreview, type GraphProposal, type ProposalEvidence } from "./schemas";

const privateTemplatePath = path.join(process.cwd(), "data", "private-config", "graph-proposals.json");

function readPrivateTemplate(): GraphPreview | null {
  try {
    return graphPreviewSchema.parse(JSON.parse(fs.readFileSync(privateTemplatePath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function evidenceIsCurrent(evidence: ProposalEvidence, documents: CorpusDocument[]) {
  if (evidence.sourceType === "owner_confirmation") {
    return ownerConfirmations.some((confirmation) => confirmation.field === evidence.confirmationField
      && confirmation.text === evidence.excerpt);
  }
  const document = documents.find((item) => item.id === evidence.sourceId);
  if (!document || document.contentHash !== evidence.contentHash || evidence.startOffset === undefined || evidence.endOffset === undefined) return false;
  const chunk = document.chunks.find((item) => item.id === evidence.chunkId);
  return document.text.slice(evidence.startOffset, evidence.endOffset) === evidence.excerpt
    && Boolean(chunk?.text.includes(evidence.excerpt));
}

function currentClaimIds(documents: CorpusDocument[], evidence: ProposalEvidence[]) {
  const chunkIds = new Set(evidence.flatMap((item) => item.chunkId ? [item.chunkId] : []));
  return documents.flatMap((document) => document.claims
    .filter((claim) => claim.chunkIds.some((chunkId) => chunkIds.has(chunkId)))
    .map((claim) => claim.id));
}

export function buildGraphPreview(documents = readCorpus()): GraphPreview {
  const template = readPrivateTemplate();
  if (!template) return { version: "empty-private-proposals", ownerConfirmationIds: [], proposals: [] };

  const proposals = template.proposals.flatMap((proposal): GraphProposal[] => {
    const evidence = proposal.evidence.filter((item) => evidenceIsCurrent(item, documents));
    if (!evidence.length) return [];
    const sourceDocumentIds = [...new Set(evidence.filter((item) => item.sourceType === "document").map((item) => item.sourceId))];
    const claimIds = currentClaimIds(documents, evidence);
    return [{ ...proposal, evidence, sourceDocumentIds, claimIds } as GraphProposal];
  });
  const supportedNodeIds = new Set(proposals.filter((proposal) => proposal.kind === "node").map((proposal) => proposal.candidateId));
  return graphPreviewSchema.parse({
    ...template,
    ownerConfirmationIds: ownerConfirmationId ? [ownerConfirmationId] : [],
    proposals: proposals.filter((proposal) => proposal.kind === "node"
      || (supportedNodeIds.has(proposal.payload.sourceCandidateId) && supportedNodeIds.has(proposal.payload.targetCandidateId))),
  });
}

export function proposalSummary(preview = buildGraphPreview()) {
  return {
    version: preview.version,
    nodes: preview.proposals.filter((proposal) => proposal.kind === "node").length,
    edges: preview.proposals.filter((proposal) => proposal.kind === "edge").length,
    pending: preview.proposals.filter((proposal) => proposal.reviewStatus === "candidate").length,
  };
}
