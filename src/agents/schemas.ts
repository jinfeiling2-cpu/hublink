import { z } from "zod";

export const claimKindSchema = z.enum([
  "confirmed",
  "self_reported",
  "planned",
  "suggested",
  "inferred",
  "open",
  "unclassified",
]);

export const authorKindSchema = z.enum(["self", "collaborator", "ai", "external", "mixed", "unknown"]);

export const reviewStatusSchema = z.enum(["candidate", "approved", "rejected"]);

export const materialKindSchema = z.enum(["resume", "research", "project", "creative", "conversation", "planning", "other"]);

export const textChunkSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  sectionPath: z.array(z.string()),
  text: z.string().min(1),
  ordinal: z.number().int().nonnegative(),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().positive(),
  speaker: authorKindSchema.optional(),
});

export const claimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: claimKindSchema,
  author: authorKindSchema,
  chunkIds: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  reviewStatus: reviewStatusSchema,
  rationale: z.string(),
});

export const documentRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  path: z.string().min(1),
  kind: materialKindSchema,
  visibility: z.enum(["public", "personal", "restricted"]),
  author: authorKindSchema,
  contentHash: z.string().min(1),
  status: z.enum(["raw", "processed", "reviewed", "archived"]),
  ownerConfirmed: z.boolean(),
  chunkCount: z.number().int().nonnegative(),
  characterCount: z.number().int().nonnegative(),
});

export const agentRunSchema = z.object({
  id: z.string().min(1),
  agent: z.string().min(1),
  mode: z.enum(["deterministic", "model"]),
  inputDocumentIds: z.array(z.string()),
  outputClaimIds: z.array(z.string()),
  status: z.enum(["completed", "failed"]),
  model: z.string().nullable(),
  promptVersion: z.string(),
  startedAt: z.string(),
  completedAt: z.string(),
  error: z.string().nullable(),
});

export const proposalEvidenceSchema = z.object({
  sourceType: z.enum(["document", "owner_confirmation"]),
  sourceId: z.string().min(1),
  chunkId: z.string().min(1).nullable(),
  excerpt: z.string().min(1),
  contentHash: z.string().min(1).optional(),
  startOffset: z.number().int().nonnegative().optional(),
  endOffset: z.number().int().positive().optional(),
  confirmationField: z.string().min(1).optional(),
});

export const nodePayloadSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  summary: z.string(),
  body: z.string(),
  role: z.string(),
  outcome: z.string(),
  status: z.string(),
  timeStart: z.string().nullable(),
  timeEnd: z.string().nullable(),
  scale: z.number().min(0).max(1),
  importance: z.number().min(0).max(1),
  centrality: z.number().min(0).max(1),
  visibility: z.enum(["public", "personal"]),
  primaryUrl: z.string(),
  exitLinks: z.array(z.object({ label: z.string(), url: z.string() })),
  categoryIds: z.array(z.string()),
});

export const edgePayloadSchema = z.object({
  sourceCandidateId: z.string().min(1),
  targetCandidateId: z.string().min(1),
  type: z.string().min(1),
  label: z.string(),
  strength: z.number().min(0).max(1),
  sortOrder: z.number().int(),
});

export const graphProposalSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string().min(1),
    kind: z.literal("node"),
    candidateId: z.string().min(1),
    payload: nodePayloadSchema,
    evidence: z.array(proposalEvidenceSchema).min(1),
    sourceDocumentIds: z.array(z.string()),
    claimIds: z.array(z.string()),
    rationale: z.string().min(1),
    confidence: z.number().min(0).max(1),
    reviewStatus: reviewStatusSchema,
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("edge"),
    candidateId: z.string().min(1),
    payload: edgePayloadSchema,
    evidence: z.array(proposalEvidenceSchema).min(1),
    sourceDocumentIds: z.array(z.string()),
    claimIds: z.array(z.string()),
    rationale: z.string().min(1),
    confidence: z.number().min(0).max(1),
    reviewStatus: reviewStatusSchema,
  }),
]);

export const graphPreviewSchema = z.object({
  version: z.string(),
  ownerConfirmationIds: z.array(z.string()),
  proposals: z.array(graphProposalSchema),
});

export type Claim = z.infer<typeof claimSchema>;
export type DocumentRecord = z.infer<typeof documentRecordSchema>;
export type TextChunk = z.infer<typeof textChunkSchema>;
export type AgentRun = z.infer<typeof agentRunSchema>;
export type GraphProposal = z.infer<typeof graphProposalSchema>;
export type GraphPreview = z.infer<typeof graphPreviewSchema>;
export type NodePayload = z.infer<typeof nodePayloadSchema>;
export type ProposalEvidence = z.infer<typeof proposalEvidenceSchema>;
