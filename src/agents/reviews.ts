import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ownerConfirmations } from "./confirmed";
import { agentDataDirectory, writeLocalJson } from "./local-store";
import type { CorpusRunArtifact } from "./orchestrator";
import { graphProposalSchema, type GraphProposal } from "./schemas";

const reviewSchema = z.object({
  id: z.string(),
  proposalId: z.string(),
  baseFingerprint: z.string(),
  reviewedAt: z.string(),
  reviewer: z.literal("local-admin"),
  proposal: graphProposalSchema,
});
export type ProposalReview = z.infer<typeof reviewSchema>;
const reviewFile = (directory: string) => path.join(directory, "proposal-reviews.json");

export function proposalFingerprint(artifact: CorpusRunArtifact, proposal: GraphProposal) {
  const sources = artifact.documents
    .filter((document) => proposal.sourceDocumentIds.includes(document.id))
    .map(({ id, contentHash }) => ({ id, contentHash }));
  return crypto.createHash("sha256").update(JSON.stringify({
    version: artifact.graphPreview.version,
    proposal,
    sources,
    ownerConfirmations,
  })).digest("hex");
}

export function readProposalReviews(directory = agentDataDirectory): ProposalReview[] {
  const file = reviewFile(directory);
  if (!fs.existsSync(file)) return [];
  return z.array(reviewSchema).parse(JSON.parse(fs.readFileSync(file, "utf8")));
}

export function applyProposalReviews(artifact: CorpusRunArtifact, reviews = readProposalReviews()): CorpusRunArtifact {
  return {
    ...artifact,
    graphPreview: {
      ...artifact.graphPreview,
      proposals: artifact.graphPreview.proposals.map((proposal) => {
        const fingerprint = proposalFingerprint(artifact, proposal);
        const matching = reviews.filter((review) => review.proposalId === proposal.id && review.baseFingerprint === fingerprint);
        return matching.at(-1)?.proposal ?? proposal;
      }),
    },
  };
}

export function saveProposalReview(
  artifact: CorpusRunArtifact,
  proposalId: string,
  expectedFingerprint: string,
  form: FormData,
  directory = agentDataDirectory,
) {
  const base = artifact.graphPreview.proposals.find((proposal) => proposal.id === proposalId);
  if (!base || proposalFingerprint(artifact, base) !== expectedFingerprint) {
    throw new Error("候选或来源已变化，请刷新页面后重新审核。");
  }
  const reviews = readProposalReviews(directory);
  const current = applyProposalReviews(artifact, reviews).graphPreview.proposals.find((proposal) => proposal.id === proposalId)!;
  const field = (name: string, fallback: string) => String(form.get(name) ?? fallback).trim();
  const proposal = graphProposalSchema.parse({
    ...current,
    reviewStatus: form.get("status"),
    payload: current.kind === "node" ? {
      ...current.payload,
      title: field("title", current.payload.title),
      summary: field("summary", current.payload.summary),
      body: field("body", current.payload.body),
    } : { ...current.payload, label: field("label", current.payload.label) },
  });
  const review = reviewSchema.parse({
    id: crypto.randomUUID(), proposalId, baseFingerprint: expectedFingerprint,
    reviewedAt: new Date().toISOString(), reviewer: "local-admin", proposal,
  });
  writeLocalJson(reviewFile(directory), [...reviews, review]);
  return review;
}
