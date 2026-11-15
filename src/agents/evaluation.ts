import { ownerConfirmations } from "./confirmed";
import { buildCuration, readingPaths } from "./curation";
import { readCorpus } from "./ingest";
import { scanPrivacy } from "./privacy";
import { buildGraphPreview } from "./proposals";

export function evaluateLocalCorpus(documents = readCorpus()) {
  const curation = buildCuration(documents);
  const preview = buildGraphPreview(documents);
  const chunks = documents.flatMap((document) => document.chunks);
  const samples = curation.samples;
  const resume = documents.find((document) => document.kind === "resume");
  const checks = [
    { id: "source-offsets", passed: chunks.every((chunk) => documents.find((document) => document.id === chunk.documentId)?.text.slice(chunk.startOffset, chunk.endOffset) === chunk.text) },
    { id: "curated-sources", passed: samples.every((sample) => sample.provenanceStatus === "matched" && sample.evidence.length > 0) },
    { id: "exact-quotes", passed: samples.every((sample) => sample.evidence.every((evidence) => {
      if (evidence.sourceType === "owner_confirmation") {
        return ownerConfirmations.some((confirmation) => confirmation.field === evidence.confirmationField && confirmation.text === evidence.excerpt);
      }
      const document = documents.find((item) => item.id === evidence.sourceId);
      return !!document && document.contentHash === evidence.contentHash
        && document.text.slice(evidence.startOffset, evidence.endOffset) === evidence.excerpt
        && document.chunks.some((chunk) => chunk.id === evidence.chunkId && chunk.text.includes(evidence.excerpt));
    })) },
    { id: "resume-separation", passed: !!resume && resume.chunks.length > 1 && scanPrivacy(resume.chunks).length > 0 && resume.chunks.some((chunk) => scanPrivacy([chunk]).length === 0) },
    { id: "review-boundary", passed: samples.every((sample) => sample.reviewStatus === "candidate") && preview.proposals.every((proposal) => proposal.reviewStatus === "candidate") },
    { id: "no-fixed-research-progress", passed: preview.proposals.filter((proposal) => proposal.kind === "node").every((proposal) => !proposal.payload.status && !proposal.payload.timeStart && !proposal.payload.timeEnd) },
    { id: "reading-path-references", passed: readingPaths.every((path) => path.steps.every((step) => samples.some((sample) => sample.id === step.sampleId))) },
    { id: "no-contact-in-reading", passed: samples.every((sample) => scanPrivacy([{
      id: sample.id, documentId: "curation", sectionPath: [], ordinal: 0, startOffset: 0,
      endOffset: 1, text: [sample.text, ...sample.evidence.map((evidence) => evidence.excerpt)].join("\n"),
    }]).length === 0) },
  ];
  return {
    version: curation.version, passed: checks.every((check) => check.passed), checks,
    summary: {
      documents: documents.length, chunks: chunks.length, samples: samples.length,
      matchedSamples: samples.filter((sample) => sample.provenanceStatus === "matched").length,
      readingPaths: readingPaths.length,
      nodes: preview.proposals.filter((proposal) => proposal.kind === "node").length,
      edges: preview.proposals.filter((proposal) => proposal.kind === "edge").length,
      externalRequests: 0,
    },
  };
}
