import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ownerConfirmationId, ownerConfirmations } from "./confirmed";
import { readCorpus, type CorpusDocument } from "./ingest";
import type { Claim, ProposalEvidence } from "./schemas";

const sourceSelectorSchema = z.union([
  z.object({ confirmationField: z.string().min(1).max(200) }),
  z.object({ quote: z.string().min(1).max(5000) }),
]);

const sampleDefinitionSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  text: z.string().min(1).max(5000),
  kind: z.enum(["self_reported", "planned", "suggested", "inferred", "open", "unclassified"]),
  basis: z.enum(["owner_statement", "document_statement", "analyst_inference"]),
  rationale: z.string().max(3000),
  boundary: z.string().max(3000),
  sources: z.array(sourceSelectorSchema).max(20),
});

const privateCurationSchema = z.object({
  version: z.string().min(1).max(200),
  researchSource: z.object({ documentId: z.string().min(1).max(200), contentHash: z.string().min(1).max(200) }).nullable(),
  definitions: z.array(sampleDefinitionSchema).max(200),
  readingPaths: z.array(z.object({
    id: z.string().min(1).max(200),
    title: z.string().min(1).max(200),
    question: z.string().min(1).max(1000),
    steps: z.array(z.object({ sampleId: z.string().min(1).max(200), reason: z.string().min(1).max(1000) })).max(100),
  })).max(50),
});

type SampleDefinition = z.infer<typeof sampleDefinitionSchema>;
export type PrivateCuration = z.infer<typeof privateCurationSchema>;
export type CuratedSample = Omit<SampleDefinition, "sources"> & {
  reviewStatus: "candidate";
  evidence: ProposalEvidence[];
  provenanceStatus: "matched" | "unavailable";
  issues: string[];
};

const privateConfigPath = path.join(process.cwd(), "data", "private-config", "curation.json");

export function readPrivateCuration(): PrivateCuration {
  try {
    return privateCurationSchema.parse(JSON.parse(fs.readFileSync(privateConfigPath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: "empty-private-curation", researchSource: null, definitions: [], readingPaths: [] };
    }
    throw error;
  }
}

const privateCuration = readPrivateCuration();
export const curationVersion = privateCuration.version;
export const readingPaths = privateCuration.readingPaths;

function resolveEvidence(
  selector: z.infer<typeof sourceSelectorSchema>,
  documents: CorpusDocument[],
  researchSource: PrivateCuration["researchSource"],
): { evidence?: ProposalEvidence; issue?: string } {
  if ("confirmationField" in selector) {
    const confirmation = ownerConfirmations.find((item) => item.field === selector.confirmationField);
    return confirmation ? { evidence: {
      sourceType: "owner_confirmation", sourceId: ownerConfirmationId, chunkId: null,
      confirmationField: confirmation.field, excerpt: confirmation.text,
    } } : { issue: "owner_confirmation_missing" };
  }
  if (!researchSource) return { issue: "source_configuration_missing" };
  const document = documents.find((item) => item.id === researchSource.documentId);
  if (!document) return { issue: "source_missing" };
  if (document.contentHash !== researchSource.contentHash) return { issue: "source_version_changed" };
  const startOffset = document.text.indexOf(selector.quote);
  if (startOffset < 0 || document.text.indexOf(selector.quote, startOffset + 1) >= 0) return { issue: "quote_missing_or_ambiguous" };
  const endOffset = startOffset + selector.quote.length;
  const chunk = document.chunks.find((item) => item.startOffset <= startOffset && item.endOffset >= endOffset && item.text.includes(selector.quote));
  if (!chunk) return { issue: "supporting_chunk_missing" };
  return { evidence: {
    sourceType: "document", sourceId: document.id, chunkId: chunk.id, contentHash: document.contentHash,
    startOffset, endOffset, excerpt: selector.quote,
  } };
}

export function buildCuration(documents = readCorpus(), config = readPrivateCuration()) {
  const samples: CuratedSample[] = config.definitions.map(({ sources, ...definition }) => {
    const resolved = sources.map((selector) => resolveEvidence(selector, documents, config.researchSource));
    const issues = resolved.flatMap((item) => item.issue ? [item.issue] : []);
    return {
      ...definition, reviewStatus: "candidate", provenanceStatus: issues.length ? "unavailable" : "matched",
      evidence: issues.length ? [] : resolved.flatMap((item) => item.evidence ? [item.evidence] : []), issues,
    };
  });
  return { version: config.version, visibility: "personal" as const, samples };
}

export type CuratedClaimKind = Claim["kind"];
