import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const statementSchema = z.object({
  text: z.string().min(1).max(3000),
  state: z.enum(["document_fact", "owner_view", "current_task", "long_term_agenda", "ai_interpretation", "speculative_vision", "open_question"]),
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
  relationships: z.array(z.object({
    title: z.string().min(1).max(160),
    explanation: z.string().max(3000),
    state: statementSchema.shape.state,
    sources: z.array(z.string().max(500)).max(20),
    caveat: z.string().max(2000),
  })).max(30),
  readers: z.array(readerSchema).length(3),
  alignmentArtifacts: z.array(statementSchema).max(30),
  unresolved: z.array(statementSchema).max(40),
});

export type PrivateMainline = z.infer<typeof privateMainlineSchema>;
export type PrivateTaskCheck = z.infer<typeof taskCheckSchema>;

const sourcePath = path.join(process.cwd(), "data", "private-mainline.json");
const reviewPath = path.join(process.cwd(), "data", "private-mainline-review.json");
const taskCheckPath = path.join(process.cwd(), "data", "private-mainline-task-check.json");
const taskRulesPath = path.join(process.cwd(), "data", "private-config", "mainline-task-rules.json");

export function readPrivateMainline(): PrivateMainline | null {
  let rawSource: string;
  try {
    rawSource = fs.readFileSync(sourcePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const source = privateMainlineSchema.parse(JSON.parse(rawSource));
  if (!fs.existsSync(reviewPath)) return source;
  const review = z.object({
    candidateCore: z.string().min(1).max(3000),
    reviewStatus: z.enum(["candidate", "accepted", "rejected", "revise"]),
    ownerNote: z.string().max(3000),
  }).parse(JSON.parse(fs.readFileSync(reviewPath, "utf8")));
  return { ...source, ...review };
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

export function savePrivateMainlineReview(input: Pick<PrivateMainline, "candidateCore" | "reviewStatus" | "ownerNote">) {
  const review = z.object({
    candidateCore: z.string().trim().min(1).max(3000),
    reviewStatus: z.enum(["candidate", "accepted", "rejected", "revise"]),
    ownerNote: z.string().max(3000),
  }).parse(input);
  fs.writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`, { mode: 0o600 });
}
