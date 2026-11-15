import type { TextChunk } from "./schemas";

export type PrivacyFinding = {
  documentId: string;
  chunkId: string;
  category: "email" | "phone" | "identity_number";
  matchCount: number;
  reviewStatus: "needs_review";
};

const patterns: Array<{ category: PrivacyFinding["category"]; pattern: RegExp }> = [
  { category: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { category: "phone", pattern: /(?<!\d)(?:\+?\d[\d -]{7,}\d)(?!\d)/g },
  { category: "identity_number", pattern: /(?<!\d)\d{17}[\dXx](?!\d)/g },
];

export function scanPrivacy(chunks: TextChunk[]): PrivacyFinding[] {
  const findings: PrivacyFinding[] = [];
  for (const chunk of chunks) {
    for (const { category, pattern } of patterns) {
      const matchCount = [...chunk.text.matchAll(pattern)].length;
      if (matchCount > 0) {
        findings.push({ documentId: chunk.documentId, chunkId: chunk.id, category, matchCount, reviewStatus: "needs_review" });
      }
    }
  }
  return findings;
}
