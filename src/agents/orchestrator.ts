import crypto from "node:crypto";
import { ownerConfirmations } from "./confirmed";
import { buildCuration, curationVersion } from "./curation";
import { corpusReport, readCorpus } from "./ingest";
import { scanPrivacy } from "./privacy";
import { buildGraphPreview } from "./proposals";
import { agentRunSchema } from "./schemas";

export const agentPipeline = [
  { id: "document-reader-v1", mode: "deterministic", purpose: "Preserve document identity and match owner confirmation to source hashes." },
  { id: "chunker-v1", mode: "deterministic", purpose: "Split resumes by line; preserve hierarchical sections, speakers, and source offsets." },
  { id: "claim-candidate-v1", mode: "deterministic", purpose: "Keep self-reports distinct from independent confirmation and AI suggestions." },
  { id: "privacy-review-v0", mode: "deterministic", purpose: "Flag possible personal contact or identity data without copying matches into the report." },
  { id: curationVersion, mode: "deterministic", purpose: "Resolve analyst-curated samples against exact source versions and quotes." },
] as const;

export type CorpusRunArtifact = ReturnType<typeof runCorpusPipeline>;

export function runCorpusPipeline() {
  const documents = readCorpus();
  const report = corpusReport(documents);
  const privacyFindings = documents.flatMap((document) => scanPrivacy(document.chunks));
  const graphPreview = buildGraphPreview(documents);
  const version = agentPipeline.map((agent) => agent.id).join("|");
  const fingerprint = documents.map((document) => `${document.id}:${document.contentHash}`).sort().join("|");
  const now = new Date().toISOString();
  const run = agentRunSchema.parse({
    id: `run-${crypto.createHash("sha256").update(JSON.stringify({ version, fingerprint, graphVersion: graphPreview.version, ownerConfirmations })).digest("hex").slice(0, 16)}`,
    agent: "local-corpus-pipeline",
    mode: "deterministic",
    inputDocumentIds: documents.map((document) => document.id),
    outputClaimIds: documents.flatMap((document) => document.claims.map((claim) => claim.id)),
    status: "completed",
    model: null,
    promptVersion: version,
    startedAt: now,
    completedAt: now,
    error: null,
  });
  return {
    run,
    report,
    privacyFindings,
    graphPreview,
    curation: buildCuration(documents),
    agentPipeline,
    documents: documents.map((document) => ({
      id: document.id,
      title: document.title,
      path: document.path,
      kind: document.kind,
      visibility: document.visibility,
      author: document.author,
      contentHash: document.contentHash,
      status: document.status,
      ownerConfirmed: document.ownerConfirmed,
      chunkCount: document.chunkCount,
      characterCount: document.characterCount,
      chunks: document.chunks,
    })),
    claims: documents.flatMap((document) => document.claims),
  };
}
