import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const isoDate = z.string().datetime();
const sourceStatus = z.enum(["candidate", "needs_review", "confirmed", "stale"]);

export const privateSourceSchema = z.object({
  id: z.string().min(1).max(100),
  sourceType: z.enum(["document", "project", "code", "paper", "conversation", "user_statement", "experiment", "other"]),
  title: z.string().trim().min(1).max(200),
  locator: z.string().max(1000),
  createdAt: isoDate,
  observedAt: isoDate.nullable(),
  effectiveDate: z.string().max(40).nullable(),
  privacy: z.literal("private"),
  verificationStatus: sourceStatus,
  checkedBy: z.enum(["admin_session"]).nullable(),
  summary: z.string().max(2000),
  scope: z.string().max(1000),
});

export const privateClaimSchema = z.object({
  id: z.string().min(1).max(100),
  content: z.string().trim().min(1).max(3000),
  claimType: z.enum(["verified_fact", "self_reported", "user_judgment", "ai_inference", "hypothesis", "speculative_vision", "deprecated_belief"]),
  status: z.enum(["candidate", "needs_review", "confirmed", "rejected", "superseded", "stale"]),
  sourceIds: z.array(z.string().max(100)).max(30),
  createdAt: isoDate,
  updatedAt: isoDate,
  checkedAt: isoDate.nullable(),
  checkedBy: z.enum(["admin_session"]).nullable(),
  scope: z.string().max(1000),
  privacy: z.literal("private"),
  proposedBy: z.enum(["user", "ai", "imported_source"]),
});

export const privateActionSchema = z.object({
  id: z.string().min(1).max(100),
  description: z.string().trim().min(1).max(2000),
  owner: z.enum(["user", "ai", "collaborator"]),
  authorizationLevel: z.enum(["L0", "L1", "L2", "L3"]),
  status: z.enum(["planned", "in_progress", "done", "cancelled"]),
  expectedResult: z.string().max(2000),
  actualResult: z.string().max(2000),
  feedback: z.string().max(2000),
  sourceIds: z.array(z.string().max(100)).max(30),
  date: z.string().max(40).nullable(),
});

export const privateFeedbackSchema = z.object({
  id: z.string().min(1).max(100),
  text: z.string().trim().min(1).max(3000),
  sourceIds: z.array(z.string().max(100)).max(30),
  createdAt: isoDate,
});

export const privateEpisodeSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(["thought", "decision"]),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(10000),
  context: z.string().max(3000),
  currentState: z.string().max(2000),
  goalsAndValues: z.string().max(2000),
  constraints: z.string().max(2000),
  options: z.array(z.string().max(1000)).max(20),
  expectedOutcomes: z.string().max(2000),
  evidenceAndUncertainty: z.string().max(3000),
  decision: z.string().max(2000),
  reasons: z.string().max(2000),
  rejectedOptions: z.array(z.string().max(1000)).max(20),
  status: z.enum(["draft", "active", "completed", "archived"]),
  projectIds: z.array(z.string().max(100)).max(30),
  goalIds: z.array(z.string().max(100)).max(30),
  privacy: z.literal("private"),
  sources: z.array(privateSourceSchema).max(100),
  claims: z.array(privateClaimSchema).max(100),
  actions: z.array(privateActionSchema).max(100),
  feedback: z.array(privateFeedbackSchema).max(100),
  createdAt: isoDate,
  updatedAt: isoDate,
  lastReviewedAt: isoDate.nullable(),
});

export const privateRecordFileSchema = z.object({
  version: z.literal(1),
  episodes: z.array(privateEpisodeSchema).max(10000),
  history: z.array(z.object({
    id: z.string().min(1).max(100),
    episodeId: z.string().min(1).max(100),
    changedAt: isoDate,
    change: z.enum(["created", "updated", "source_added", "source_updated", "claim_added", "claim_updated", "action_added", "action_updated", "feedback_added", "archived", "restored"]),
    snapshot: privateEpisodeSchema,
  })).max(100000),
});

export type PrivateEpisode = z.infer<typeof privateEpisodeSchema>;
export type PrivateSource = z.infer<typeof privateSourceSchema>;
export type PrivateClaim = z.infer<typeof privateClaimSchema>;
export type PrivateAction = z.infer<typeof privateActionSchema>;
export type PrivateFeedback = z.infer<typeof privateFeedbackSchema>;
export type PrivateRecordFile = z.infer<typeof privateRecordFileSchema>;

const defaultFile = () => path.join(process.cwd(), "data", "private-records.json");
const now = () => new Date().toISOString();

export function readPrivateRecordFile(filePath = defaultFile()): PrivateRecordFile {
  try {
    return privateRecordFileSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, episodes: [], history: [] };
    throw error;
  }
}

function writePrivateRecordFile(filePath: string, file: PrivateRecordFile) {
  const parsed = privateRecordFileSchema.parse(file);
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temporary = `${filePath}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  fs.renameSync(temporary, filePath);
  fs.chmodSync(filePath, 0o600);
}

function appendRevision(file: PrivateRecordFile, snapshot: PrivateEpisode, change: z.infer<typeof privateRecordFileSchema>["history"][number]["change"]) {
  file.history.push({ id: randomUUID(), episodeId: snapshot.id, changedAt: now(), change, snapshot: structuredClone(snapshot) });
}

export function createPrivateEpisode(input: { kind: "thought" | "decision"; title: string; body?: string }, filePath = defaultFile()) {
  const timestamp = now();
  const episode = privateEpisodeSchema.parse({
    id: randomUUID(), kind: input.kind, title: input.title, body: input.body ?? "", context: "", currentState: "",
    goalsAndValues: "", constraints: "", options: [], expectedOutcomes: "", evidenceAndUncertainty: "",
    decision: "", reasons: "", rejectedOptions: [], status: "draft", projectIds: [], goalIds: [], privacy: "private",
    sources: [], claims: [], actions: [], feedback: [], createdAt: timestamp, updatedAt: timestamp, lastReviewedAt: null,
  });
  const file = readPrivateRecordFile(filePath);
  file.episodes.push(episode);
  appendRevision(file, episode, "created");
  writePrivateRecordFile(filePath, file);
  return episode;
}

export function updatePrivateEpisode(id: string, patch: Partial<Pick<PrivateEpisode,
  "kind" | "title" | "body" | "context" | "currentState" | "goalsAndValues" | "constraints" | "options" |
  "expectedOutcomes" | "evidenceAndUncertainty" | "decision" | "reasons" | "rejectedOptions" | "status" | "projectIds" | "goalIds" | "lastReviewedAt"
>>, filePath = defaultFile()) {
  const file = readPrivateRecordFile(filePath);
  const index = file.episodes.findIndex((episode) => episode.id === id);
  if (index < 0) throw new Error("Private record not found.");
  const updated = privateEpisodeSchema.parse({ ...file.episodes[index], ...patch, updatedAt: now() });
  const previousStatus = file.episodes[index].status;
  file.episodes[index] = updated;
  appendRevision(file, updated, updated.status === "archived" ? "archived" : previousStatus === "archived" ? "restored" : "updated");
  writePrivateRecordFile(filePath, file);
  return updated;
}

type ChildInput = Omit<PrivateSource | PrivateClaim | PrivateAction | PrivateFeedback, "id">;

function appendChild<T extends "sources" | "claims" | "actions" | "feedback">(
  id: string, key: T, child: ChildInput, change: "source_added" | "claim_added" | "action_added" | "feedback_added", filePath: string,
) {
  const file = readPrivateRecordFile(filePath);
  const index = file.episodes.findIndex((episode) => episode.id === id);
  if (index < 0) throw new Error("Private record not found.");
  const episode = structuredClone(file.episodes[index]) as PrivateEpisode;
  const entry = { ...child, id: randomUUID() };
  const schema = { sources: privateSourceSchema, claims: privateClaimSchema, actions: privateActionSchema, feedback: privateFeedbackSchema }[key];
  const parsedEntry = schema.parse(entry) as never;
  (episode[key] as unknown[]).push(parsedEntry);
  const sourceIds = new Set(episode.sources.map((source) => source.id));
  const referenced = key === "claims" || key === "actions" || key === "feedback" ? (parsedEntry as { sourceIds: string[] }).sourceIds : [];
  if (referenced.some((sourceId) => !sourceIds.has(sourceId))) throw new Error("Unknown private source reference.");
  const updated = privateEpisodeSchema.parse({ ...episode, updatedAt: now() });
  file.episodes[index] = updated;
  appendRevision(file, updated, change);
  writePrivateRecordFile(filePath, file);
  return updated;
}

export function addPrivateSource(id: string, input: Omit<PrivateSource, "id" | "createdAt" | "checkedBy"> & { createdAt?: string }, filePath = defaultFile()) {
  const createdAt = input.createdAt ?? now();
  const checkedBy = input.verificationStatus === "confirmed" ? "admin_session" : null;
  return appendChild(id, "sources", { ...input, createdAt, checkedBy }, "source_added", filePath);
}

export function addPrivateClaim(id: string, input: Omit<PrivateClaim, "id" | "createdAt" | "updatedAt" | "checkedBy"> & { checkedAt?: string | null }, filePath = defaultFile()) {
  const timestamp = now();
  const checkedBy = input.status === "confirmed" || input.status === "rejected" ? "admin_session" : null;
  return appendChild(id, "claims", { ...input, checkedBy, createdAt: timestamp, updatedAt: timestamp }, "claim_added", filePath);
}

export function addPrivateAction(id: string, input: Omit<PrivateAction, "id">, filePath = defaultFile()) {
  return appendChild(id, "actions", input, "action_added", filePath);
}

export function addPrivateFeedback(id: string, input: Omit<PrivateFeedback, "id" | "createdAt">, filePath = defaultFile()) {
  return appendChild(id, "feedback", { ...input, createdAt: now() }, "feedback_added", filePath);
}

export function updatePrivateSourceStatus(id: string, sourceId: string, verificationStatus: PrivateSource["verificationStatus"], filePath = defaultFile()) {
  const file = readPrivateRecordFile(filePath);
  const index = file.episodes.findIndex((episode) => episode.id === id);
  if (index < 0) throw new Error("Private record not found.");
  const episode = structuredClone(file.episodes[index]);
  const source = episode.sources.find((item) => item.id === sourceId);
  if (!source) throw new Error("Private source not found.");
  source.verificationStatus = verificationStatus;
  source.observedAt = now();
  source.checkedBy = verificationStatus === "confirmed" ? "admin_session" : null;
  const updated = privateEpisodeSchema.parse({ ...episode, updatedAt: now() });
  file.episodes[index] = updated;
  appendRevision(file, updated, "source_updated");
  writePrivateRecordFile(filePath, file);
  return updated;
}

export function updatePrivateClaimStatus(
  id: string, claimId: string, status: PrivateClaim["status"], filePath = defaultFile(),
) {
  const file = readPrivateRecordFile(filePath);
  const index = file.episodes.findIndex((episode) => episode.id === id);
  if (index < 0) throw new Error("Private record not found.");
  const episode = structuredClone(file.episodes[index]);
  const claim = episode.claims.find((item) => item.id === claimId);
  if (!claim) throw new Error("Private claim not found.");
  const timestamp = now();
  claim.status = status;
  claim.updatedAt = timestamp;
  claim.checkedAt = status === "confirmed" || status === "rejected" ? timestamp : null;
  claim.checkedBy = status === "confirmed" || status === "rejected" ? "admin_session" : null;
  const updated = privateEpisodeSchema.parse({ ...episode, updatedAt: timestamp });
  file.episodes[index] = updated;
  appendRevision(file, updated, "claim_updated");
  writePrivateRecordFile(filePath, file);
  return updated;
}

export function updatePrivateActionResult(
  id: string,
  actionId: string,
  patch: Pick<PrivateAction, "status" | "actualResult" | "feedback">,
  filePath = defaultFile(),
) {
  const file = readPrivateRecordFile(filePath);
  const index = file.episodes.findIndex((episode) => episode.id === id);
  if (index < 0) throw new Error("Private record not found.");
  const episode = structuredClone(file.episodes[index]);
  const action = episode.actions.find((item) => item.id === actionId);
  if (!action) throw new Error("Private action not found.");
  Object.assign(action, patch);
  const updated = privateEpisodeSchema.parse({ ...episode, updatedAt: now() });
  file.episodes[index] = updated;
  appendRevision(file, updated, "action_updated");
  writePrivateRecordFile(filePath, file);
  return updated;
}
