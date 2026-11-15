import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { confirmedResumeSources } from "./confirmed";
import { claimSchema, documentRecordSchema, textChunkSchema, type Claim, type DocumentRecord, type TextChunk } from "./schemas";

export type CorpusDocument = DocumentRecord & { text: string; chunks: TextChunk[]; claims: Claim[] };

const corpusRoot = path.join(process.cwd(), "data", "material-text");

const kindFor = (fileName: string): DocumentRecord["kind"] => {
  if (fileName.includes("简历")) return "resume";
  if (fileName.includes("研究") || fileName.includes("发展路线")) return "research";
  if (fileName.includes("模拟器") || fileName.includes("武器") || fileName.includes("承脉")) return "creative";
  if (fileName.includes("规划") || fileName.includes("目标")) return "planning";
  if (fileName.includes("光锥")) return "conversation";
  return "other";
};

function stableId(prefix: string, value: string) {
  return `${prefix}-${crypto.createHash("sha1").update(value).digest("hex").slice(0, 12)}`;
}

function titleFor(filePath: string) {
  return path.basename(filePath, path.extname(filePath));
}

export function splitChunks(text: string, documentId: string, linewise = false): TextChunk[] {
  const lines = text.split("\n");
  const chunks: TextChunk[] = [];
  let offset = 0;
  let current: string[] = [];
  let start = 0;
  let sectionPath: string[] = [];
  let speaker: Claim["author"] = "unknown";
  const flush = () => {
    const joined = current.join("\n");
    const leading = joined.length - joined.trimStart().length;
    const value = joined.trim();
    if (value) {
      const chunkStart = start + leading;
      const end = chunkStart + value.length;
      chunks.push(textChunkSchema.parse({
        id: stableId("chunk", `${documentId}:${chunks.length}:${value}`),
        documentId,
        sectionPath,
        text: value,
        ordinal: chunks.length,
        startOffset: chunkStart,
        endOffset: end,
        speaker,
      }));
    }
    current = [];
  };
  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
      ?? /^(第[一二三四五六七八九十百]+[章节部分])\s*(.*)$/.exec(line)
      ?? /^([一二三四五六七八九十百]+、)\s*(.*)$/.exec(line);
    const numericHeading = /^(\d+(?:\.\d+)*)(?:[.、])?\s+(.+)$/.exec(line);
    const numericIsHeading = numericHeading && numericHeading[2].length < 90 && !/[。；！？]$/.test(numericHeading[2].trim());
    if (heading || numericIsHeading) {
      flush();
      const marker = heading ? heading[1] : numericHeading![1];
      const level = marker.startsWith("#") ? marker.length : numericIsHeading ? marker.split(".").length : 1;
      const label = heading ? marker.startsWith("#") ? heading[2] : `${marker} ${heading[2] ?? ""}`.trim() : `${marker} ${numericHeading![2]}`;
      sectionPath = [...sectionPath.slice(0, Math.max(0, level - 1)), label];
    } else if (/^(你说|本人|我说|ChatGPT 说|Gemini 说|助手说)\s*[：:]/.test(line)) {
      flush();
      speaker = /^(你说|本人|我说)\s*[：:]/.test(line) ? "self" : "ai";
      current.push(line);
      start = offset;
      flush();
    } else if (/^(\s*[-*+]\s+|\s*\d+[.、)]\s+)/.test(line)) {
      flush();
      current.push(line);
      start = offset;
      flush();
    } else if (!line.trim()) {
      flush();
    } else {
      if (linewise) flush();
      if (current.length === 0) start = offset;
      current.push(line);
    }
    offset += line.length + 1;
  }
  flush();
  return chunks;
}

function claimsFor(chunks: TextChunk[], ownerConfirmed: boolean): Claim[] {
  return chunks.flatMap((chunk) => {
    const text = chunk.text.replace(/^(你说|本人|我说|ChatGPT 说|Gemini 说|助手说)\s*[：:]\s*/, "");
    const explicitSpeaker = /^(你说|本人|我说)\s*[：:]/.exec(chunk.text)?.[1];
    const aiSpeaker = /^(ChatGPT 说|Gemini 说|助手说)\s*[：:]/.exec(chunk.text)?.[1];
    const author: Claim["author"] = explicitSpeaker ? "self" : aiSpeaker ? "ai" : chunk.speaker && chunk.speaker !== "unknown" ? chunk.speaker : ownerConfirmed ? "self" : "unknown";
    const statements = text.match(/[^。！？!?；;\n]+[。！？!?；;]?/g) ?? [];
    return statements.map((statement, index) => {
      const value = statement.trim();
      const planned = /计划|规划|希望|未来|下一步|待确认|尚未|正在整理|准备/.test(value);
      const suggested = /建议|可以考虑|可考虑|最好|应当|应该/.test(value) || author === "ai";
      const open = /待确认|尚未明确|仍需|需要确认|未解决|不知道|不确定/.test(value);
      const kind: Claim["kind"] = open ? "open" : author === "ai" ? "suggested" : planned ? "planned" : suggested ? "suggested" : ownerConfirmed ? "self_reported" : "unclassified";
      return claimSchema.parse({
        id: stableId("claim", `${chunk.id}:${index}:${value}`),
        text: value,
        kind,
        author,
        chunkIds: [chunk.id],
        confidence: kind === "unclassified" ? 0.4 : ownerConfirmed ? 0.96 : 0.64,
        reviewStatus: "candidate",
        rationale: "确定性首轮分段，仅依据显式说话人和词面线索标记；未判定为事实，需逐条审核。",
      });
    }).filter((claim) => claim.text.length >= 4);
  });
}

export function readCorpus(root = corpusRoot): CorpusDocument[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root)
    .filter((file) => file.endsWith(".txt") || file.endsWith(".md"))
    .sort()
    .map((file) => {
      const filePath = path.join(root, file);
      const text = fs.readFileSync(filePath, "utf8");
      const contentHash = crypto.createHash("sha256").update(text).digest("hex");
      const id = stableId("doc", file);
      const ownerConfirmed = confirmedResumeSources.some((source) => source.documentId === id && source.contentHash === contentHash);
      const chunks = splitChunks(text, id, kindFor(file) === "resume");
      return {
        ...documentRecordSchema.parse({
          id,
          title: titleFor(filePath),
          path: path.relative(process.cwd(), filePath),
          kind: kindFor(file),
          visibility: "personal",
          author: ownerConfirmed ? "self" : "unknown",
          contentHash,
          status: ownerConfirmed ? "reviewed" : "processed",
          ownerConfirmed,
          chunkCount: chunks.length,
          characterCount: text.length,
        }),
        text,
        chunks,
        claims: claimsFor(chunks, ownerConfirmed),
      };
    });
}

export function corpusReport(documents = readCorpus()) {
  const allClaims = documents.flatMap((document) => document.claims);
  const documentSummaries = documents.map((document) => ({
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
  }));
  return {
    documents: documentSummaries,
    chunks: documents.reduce((sum, document) => sum + document.chunks.length, 0),
    claims: allClaims.length,
    reviewQueue: allClaims.length,
    byClaimKind: Object.fromEntries([...new Set(allClaims.map((claim) => claim.kind))].map((kind) => [kind, allClaims.filter((claim) => claim.kind === kind).length])),
    byAuthor: Object.fromEntries([...new Set(allClaims.map((claim) => claim.author))].map((author) => [author, allClaims.filter((claim) => claim.author === author).length])),
    byKind: Object.fromEntries([...new Set(documents.map((document) => document.kind))].map((kind) => [kind, documents.filter((document) => document.kind === kind).length])),
    claimSamples: allClaims.slice(0, 24),
  };
}
