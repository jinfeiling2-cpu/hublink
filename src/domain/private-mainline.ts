import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const statementSchema = z.object({
  text: z.string().min(1).max(3000),
  state: z.enum(["document_fact", "owner_view", "current_task", "long_term_agenda", "ai_interpretation", "hypothesis", "speculative_vision", "open_question"]),
  sources: z.array(z.string().max(500)).max(20),
  boundary: z.string().max(2000),
});

const readerSchema = z.object({
  id: z.enum(["algorithm_recruiter", "deep_personal_reader", "ai_collaborator"]),
  title: z.string().min(1).max(120),
  purpose: z.string().max(1000),
  text: z.string().max(5000),
  sources: z.array(z.string().max(500)).max(20),
  selected: z.array(z.string().max(200)).max(30),
  omitted: z.array(z.string().max(500)).max(30),
  leakageGuard: z.array(z.string().max(500)).max(30),
  unknowns: z.array(z.string().max(500)).max(30),
});

const taskCheckSchema = z.object({
  task: z.string().min(1).max(2000),
  warnings: z.array(z.string().max(1000)).max(10),
  checkedAt: z.string().datetime(),
});

const reviewSchema = z.object({
  candidateCore: z.string().min(1).max(3000),
  reviewStatus: z.enum(["candidate", "accepted", "rejected", "revise"]),
  ownerNote: z.string().max(3000),
  history: z.array(z.object({
    candidateCore: z.string().min(1).max(3000),
    reviewStatus: z.enum(["candidate", "accepted", "rejected", "revise"]),
    ownerNote: z.string().max(3000),
    changedAt: z.string().datetime(),
  })).max(100).default([]),
  relationshipReviews: z.array(z.object({
    title: z.string().min(1).max(160),
    status: z.enum(["candidate", "owner_confirmed", "rejected", "superseded"]),
    explanationOverride: z.string().max(3000),
    ownerNote: z.string().max(2000),
    history: z.array(z.object({
      status: z.enum(["candidate", "owner_confirmed", "rejected", "superseded"]),
      explanationOverride: z.string().max(3000),
      ownerNote: z.string().max(2000),
      changedAt: z.string().datetime(),
    })).max(100).default([]),
  })).max(30).default([]),
});

const relationshipSchema = z.object({
  title: z.string().min(1).max(160),
  kind: z.enum(["expresses", "supports", "contradicts", "motivated", "method_transfer", "structural_analogy", "evolved_from", "supersedes", "co_emerged", "related_to"]).default("related_to"),
  explanation: z.string().max(3000),
  explanationOverride: z.string().max(3000).default(""),
  state: statementSchema.shape.state,
  proposedBy: z.enum(["user", "ai", "imported_source"]).default("ai"),
  status: z.enum(["candidate", "owner_confirmed", "rejected", "superseded"]).default("candidate"),
  sources: z.array(z.string().max(500)).max(20),
  counterEvidence: z.array(z.string().max(1000)).max(20).default([]),
  validWithin: z.string().max(1000).default(""),
  caveat: z.string().max(2000),
  privacy: z.literal("private").default("private"),
  ownerNote: z.string().max(2000).default(""),
  reviewHistory: z.array(z.object({
    status: z.enum(["candidate", "owner_confirmed", "rejected", "superseded"]),
    explanationOverride: z.string().max(3000),
    ownerNote: z.string().max(2000),
    changedAt: z.string().datetime(),
  })).max(100).default([]),
});

const hypothesisSchema = z.object({
  title: z.string().min(1).max(160),
  explanation: z.string().max(3000),
  state: statementSchema.shape.state,
  status: z.enum(["candidate", "owner_confirmed", "rejected", "superseded"]).default("candidate"),
  sources: z.array(z.string().max(500)).max(20),
  counterEvidence: z.array(z.string().max(1000)).max(20).default([]),
  boundary: z.string().max(2000),
  privacy: z.literal("private").default("private"),
});

export const privateTaskRuleSchema = z.object({
  id: z.string().min(1).max(200),
  patterns: z.array(z.string().min(1).max(300)).min(1).max(10),
  warning: z.string().min(1).max(1000),
});

export const privateMainlineSchema = z.object({
  version: z.literal(1),
  title: z.string().min(1).max(160),
  candidateCore: z.string().min(1).max(3000),
  reviewStatus: z.enum(["candidate", "accepted", "rejected", "revise"]),
  ownerNote: z.string().max(3000),
  thinkingMethod: z.array(statementSchema).max(20),
  relationships: z.array(relationshipSchema).max(30),
  competingHypotheses: z.array(hypothesisSchema).max(20).default([]),
  readers: z.array(readerSchema).length(3),
  alignmentArtifacts: z.array(statementSchema).max(30),
  unresolved: z.array(statementSchema).max(40),
});

export type PrivateMainline = z.infer<typeof privateMainlineSchema>;
export type PrivateTaskCheck = z.infer<typeof taskCheckSchema>;
export type PrivateMainlineReview = z.infer<typeof reviewSchema>;

const sourcePath = path.join(process.cwd(), "data", "private-mainline.json");
const reviewPath = path.join(process.cwd(), "data", "private-mainline-review.json");
const taskCheckPath = path.join(process.cwd(), "data", "private-mainline-task-check.json");
const taskRulesPath = path.join(process.cwd(), "data", "private-config", "mainline-task-rules.json");

export function readPrivateMainline(filePath = sourcePath, reviewFilePath = reviewPath): PrivateMainline | null {
  let rawSource: string;
  try {
    rawSource = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const source = privateMainlineSchema.parse(JSON.parse(rawSource));
  if (!fs.existsSync(reviewFilePath)) return source;
  const review = reviewSchema.parse(JSON.parse(fs.readFileSync(reviewFilePath, "utf8")));
  const relationshipReviews = new Map(review.relationshipReviews.map((item) => [item.title, item]));
  return {
    ...source,
    ...review,
    relationships: source.relationships.map((relationship) => {
      const saved = relationshipReviews.get(relationship.title);
      return saved ? {
        ...relationship,
        status: saved.status,
        explanation: saved.explanationOverride || relationship.explanation,
        explanationOverride: saved.explanationOverride,
        ownerNote: saved.ownerNote,
        reviewHistory: saved.history,
      } : relationship;
    }),
  };
}

export function readPrivateMainlineReviewHistory(filePath = reviewPath) {
  if (!fs.existsSync(filePath)) return [];
  return reviewSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf8"))).history;
}

export function checkNewTaskAgainstBoundaries(task: string, rules = readPrivateTaskRules()): PrivateTaskCheck {
  const cleanTask = z.string().trim().min(1).max(2000).parse(task);
  const warnings = rules
    .filter((rule) => rule.patterns.every((pattern) => new RegExp(pattern, "i").test(cleanTask)))
    .map((rule) => rule.warning);
  return taskCheckSchema.parse({ task: cleanTask, warnings, checkedAt: new Date().toISOString() });
}

function readPrivateTaskRules() {
  try {
    return z.array(privateTaskRuleSchema).max(100).parse(JSON.parse(fs.readFileSync(taskRulesPath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export function savePrivateTaskCheck(input: PrivateTaskCheck) {
  const check = taskCheckSchema.parse(input);
  fs.writeFileSync(taskCheckPath, `${JSON.stringify(check, null, 2)}\n`, { mode: 0o600 });
}

export function readPrivateTaskCheck(): PrivateTaskCheck | null {
  if (!fs.existsSync(taskCheckPath)) return null;
  return taskCheckSchema.parse(JSON.parse(fs.readFileSync(taskCheckPath, "utf8")));
}

export function savePrivateMainlineReview(
  input: Pick<PrivateMainline, "candidateCore" | "reviewStatus" | "ownerNote">,
  filePath = reviewPath,
  baselinePath = sourcePath,
) {
  const update = z.object({
    candidateCore: z.string().trim().min(1).max(3000),
    reviewStatus: z.enum(["candidate", "accepted", "rejected", "revise"]),
    ownerNote: z.string().max(3000),
  }).parse(input);
  let current: PrivateMainlineReview | null = null;
  try { current = reviewSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf8"))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  if (!current) {
    try {
      const baseline = privateMainlineSchema.parse(JSON.parse(fs.readFileSync(baselinePath, "utf8")));
      current = { candidateCore: baseline.candidateCore, reviewStatus: baseline.reviewStatus, ownerNote: baseline.ownerNote, history: [], relationshipReviews: [] };
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  const history = [...(current?.history ?? [])];
  if (current) history.push({ candidateCore: current.candidateCore, reviewStatus: current.reviewStatus, ownerNote: current.ownerNote, changedAt: new Date().toISOString() });
  if (history.length > 100) history.splice(0, history.length - 100);
  writePrivateReviewFile(filePath, reviewSchema.parse({ ...update, history, relationshipReviews: current?.relationshipReviews ?? [] }));
}

export function savePrivateRelationshipReview(
  input: { title: string; status: "candidate" | "owner_confirmed" | "rejected" | "superseded"; explanationOverride: string; ownerNote: string },
  filePath = reviewPath,
  baselinePath = sourcePath,
) {
  const update = z.object({ title: z.string().trim().min(1).max(160), status: z.enum(["candidate", "owner_confirmed", "rejected", "superseded"]), explanationOverride: z.string().max(3000), ownerNote: z.string().max(2000) }).parse(input);
  const baseline = privateMainlineSchema.parse(JSON.parse(fs.readFileSync(baselinePath, "utf8")));
  if (!baseline.relationships.some((relationship) => relationship.title === update.title)) throw new Error("Unknown private mainline relationship.");
  let current: PrivateMainlineReview | null = null;
  try { current = reviewSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf8"))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const relationshipReviews = [...(current?.relationshipReviews ?? [])];
  const index = relationshipReviews.findIndex((item) => item.title === update.title);
  const previous = index >= 0 ? relationshipReviews[index] : {
    title: update.title,
    status: baseline.relationships.find((relationship) => relationship.title === update.title)!.status,
    explanationOverride: "",
    ownerNote: "",
    history: [],
  };
  const history = [...previous.history, { status: previous.status, explanationOverride: previous.explanationOverride, ownerNote: previous.ownerNote, changedAt: new Date().toISOString() }];
  const next = { ...update, history: history.slice(-100) };
  if (index >= 0) relationshipReviews[index] = next;
  else relationshipReviews.push(next);
  writePrivateReviewFile(filePath, reviewSchema.parse({
    candidateCore: current?.candidateCore ?? baseline.candidateCore,
    reviewStatus: current?.reviewStatus ?? baseline.reviewStatus,
    ownerNote: current?.ownerNote ?? baseline.ownerNote,
    history: current?.history ?? [],
    relationshipReviews,
  }));
}

function writePrivateReviewFile(filePath: string, review: PrivateMainlineReview) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temporary = `${filePath}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(review, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  fs.renameSync(temporary, filePath);
  fs.chmodSync(filePath, 0o600);
}
