"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { edgeTypes } from "@/domain/registry";
import { mergeSourcePull } from "@/domain/graph";
import { readNodeFields } from "@/domain/schema";
import {
  createEdge,
  createNode,
  deleteEdge,
  deleteNode,
  findNodeBySource,
  getNode,
  listEdges,
  listNodes,
  setVisibility,
  setResumeProjectionNode,
  updateNode,
  createContributionNode,
  setContributionParent,
  createResumeDraft,
  saveResumeDraft,
  getResumeDraft,
} from "@/db/store";
import { GithubPullError, pullGithubRepo } from "@/lib/github";
import { clearAdminCookie, isAdmin, passwordMatches, setAdminCookie } from "@/lib/session";
import type { Visibility } from "@/domain/types";
import { runLocalCorpus } from "@/agents/run-local";
import { saveProposalReview } from "@/agents/reviews";
import { runCorpusPipeline } from "@/agents/orchestrator";
import { readHublinkContributionCandidates } from "@/domain/hublink-contribution-candidates";
import { resumeDraftContentSchema, resumeDraftInputSchema, validateResumeDraftContent, type ResumeDraftContent } from "@/domain/resume-draft";
import { checkNewTaskAgainstBoundaries, savePrivateMainlineReview, savePrivateTaskCheck } from "@/domain/private-mainline";
import {
  addPrivateAction,
  addPrivateClaim,
  addPrivateFeedback,
  addPrivateSource,
  createPrivateEpisode,
  updatePrivateClaimStatus,
  updatePrivateActionResult,
  updatePrivateEpisode,
  updatePrivateSourceStatus,
} from "@/domain/private-records";

export type FormState = { error: string };

async function assertAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function login(_state: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) return { error: "口令不对。" };
  await setAdminCookie();
  redirect("/admin");
}

export async function logout() {
  await clearAdminCookie();
  redirect("/");
}

export async function runCorpus() {
  await assertAdmin();
  runLocalCorpus();
  refresh();
  redirect("/admin/corpus?notice=ran");
}

export async function reviewCorpusProposal(formData: FormData) {
  await assertAdmin();
  const proposalId = String(formData.get("proposalId") ?? "");
  const artifact = runCorpusPipeline();
  saveProposalReview(artifact, proposalId, String(formData.get("fingerprint") ?? ""), formData);
  revalidatePath("/admin/corpus");
  revalidatePath("/admin/corpus/reading");
  redirect("/admin/corpus?notice=reviewed");
}

export async function saveNode(_state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const parsed = readNodeFields(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "这份节点还不完整。" };
  }
  const id = String(formData.get("id") ?? "");
  const parentNodeId = String(formData.get("parentNodeId") ?? "");
  if (id) {
    const existing = getNode(id);
    if (!existing) return { error: "节点已经不在了。" };
    if ((existing.type === "contribution") !== (parsed.data.type === "contribution")) {
      return { error: "个人贡献不能直接转换为其他节点类型；请新建独立贡献或保留其类型。" };
    }
    const currentParentId = existing.type === "contribution"
      ? listEdges().find((edge) => edge.type === "contribution_to" && edge.sourceId === id)?.targetId ?? ""
      : "";
    const contributionParentId = parentNodeId || currentParentId;
    if (parsed.data.type === "contribution") {
      const parent = getNode(contributionParentId);
      if (!parent || !["project", "experience"].includes(parent.type)) return { error: "请关联一个已有项目或经历。" };
    }
    const input = {
      ...parsed.data,
      visibility: parsed.data.type === "contribution" && parsed.data.contributionReview !== "owner_confirmed" ? "personal" as const : parsed.data.visibility,
      sourceKind: existing.sourceKind,
      sourceExternalId: existing.sourceExternalId,
      sourcePrivate: existing.sourcePrivate,
      sourceSnapshot: existing.sourceSnapshot,
    };
    updateNode(id, input);
    if (existing.type === "contribution" || input.type === "contribution") {
      if (input.type === "contribution") setContributionParent(id, contributionParentId);
    }
    refresh();
    redirect(`/admin/nodes/${id}?notice=saved`);
  }
  const input = {
    ...parsed.data,
    visibility: parsed.data.type === "contribution" ? "personal" as const : parsed.data.visibility,
    sourceKind: "",
    sourceExternalId: "",
    sourcePrivate: false,
    sourceSnapshot: null,
  };
  if (input.type === "contribution") {
    if (!parentNodeId) return { error: "个人贡献需要关联到一个项目或经历。" };
    let created: string;
    try { created = createContributionNode(input, parentNodeId); }
    catch (error) { return { error: error instanceof Error ? error.message : "贡献关联保存失败。" }; }
    refresh();
    redirect(`/admin/nodes/${created}?notice=saved`);
  }
  const created = createNode(input);
  refresh();
  redirect(`/admin/nodes/${created}?notice=saved`);
}

export async function initializeHublinkContributionCandidates() {
  await assertAdmin();
  const project = getNode("hublink");
  if (!project || project.type !== "project") redirect("/admin/resume?notice=no-project");
  let created = 0;
  for (const candidate of readHublinkContributionCandidates()) {
    if (getNode(candidate.id)) continue;
    createContributionNode(candidate.input, project.id, undefined, candidate.id);
    created += 1;
  }
  revalidatePath("/admin/resume");
  revalidatePath(`/admin/nodes/${project.id}`);
  redirect(`/admin/resume?notice=candidates-${created}`);
}

export async function createResumeDraftAction(formData: FormData) {
  await assertAdmin();
  const parsed = resumeDraftInputSchema.safeParse({
    id: randomUUID(),
    title: String(formData.get("title") ?? ""),
    targetRole: String(formData.get("targetRole") ?? ""),
    content: { entries: [] },
  });
  if (!parsed.success) redirect("/admin/resume/drafts/new?notice=invalid");
  const id = createResumeDraft({ title: parsed.data.title, targetRole: parsed.data.targetRole, content: parsed.data.content });
  redirect(`/admin/resume/drafts/${id}`);
}

export async function createStarterResumeDraft(formData: FormData) {
  await assertAdmin();
  const kind = String(formData.get("kind") ?? "");
  if (kind !== "a" && kind !== "b") redirect("/admin/resume/drafts?notice=invalid");
  createResumeDraft({
    title: kind === "a" ? "算法实习方向验证稿" : "软件工程 / 系统设计对照稿",
    targetRole: kind === "a"
      ? "算法实习（验证方向：LLM/Agent、空间智能、行为建模；目标待本人调整）"
      : "软件工程 / 系统设计（对照验证，不代表求职意向变更）",
    content: resumeDraftContentSchema.parse({
      entries: [],
      target: { kind: "general", domain: kind === "a" ? "LLM/Agent、空间智能、行为建模" : "软件工程、系统设计", generalLabel: kind === "a" ? "算法实习验证方向 · 通用草稿" : "软件工程对照方向 · 通用草稿" },
    }),
  });
  redirect("/admin/resume/drafts?notice=starter-created");
}

export async function saveResumeDraftAction(formData: FormData) {
  await assertAdmin();
  const rawContent = String(formData.get("contentJson") ?? "");
  let content: unknown;
  try { content = JSON.parse(rawContent); } catch { redirect("/admin/resume/drafts?notice=invalid-json"); }
  const parsed = resumeDraftInputSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    title: String(formData.get("title") ?? ""),
    targetRole: String(formData.get("targetRole") ?? ""),
    content,
  });
  if (!parsed.success) redirect("/admin/resume/drafts?notice=invalid");
  if (!getResumeDraft(parsed.data.id)) redirect("/admin/resume/drafts?notice=missing");
  let validated: ResumeDraftContent;
  try { validated = validateResumeDraftContent(parsed.data.content, listNodes("all"), listEdges()); }
  catch { redirect(`/admin/resume/drafts/${parsed.data.id}?notice=invalid-selection`); }
  saveResumeDraft({ ...parsed.data, content: validated });
  revalidatePath(`/admin/resume/drafts/${parsed.data.id}`);
  revalidatePath(`/admin/resume/drafts/${parsed.data.id}/preview`);
  redirect(`/admin/resume/drafts/${parsed.data.id}?notice=saved`);
}

export async function savePrivateMainlineReviewAction(formData: FormData) {
  await assertAdmin();
  try {
    savePrivateMainlineReview({
      candidateCore: String(formData.get("candidateCore") ?? ""),
      reviewStatus: String(formData.get("reviewStatus") ?? "candidate") as "candidate" | "accepted" | "rejected" | "revise",
      ownerNote: String(formData.get("ownerNote") ?? ""),
    });
  } catch {
    redirect("/admin/mainline?notice=invalid");
  }
  revalidatePath("/admin/mainline");
  redirect("/admin/mainline?notice=saved");
}

export async function checkPrivateMainlineTaskAction(formData: FormData) {
  await assertAdmin();
  try {
    savePrivateTaskCheck(checkNewTaskAgainstBoundaries(String(formData.get("task") ?? "")));
  } catch {
    redirect("/admin/mainline?notice=invalid-task");
  }
  revalidatePath("/admin/mainline");
  redirect("/admin/mainline?notice=task-checked");
}

export async function createPrivateEpisodeAction(formData: FormData) {
  await assertAdmin();
  let episodeId = "";
  try {
    const episode = createPrivateEpisode({
      kind: String(formData.get("kind") ?? "thought") as "thought" | "decision",
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
    });
    episodeId = episode.id;
  } catch {
    redirect("/admin/records?notice=invalid");
  }
  redirect(`/admin/records/${episodeId}`);
}

export async function updatePrivateEpisodeAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const projectIds = formData.getAll("projectIds").map(String);
  const goalIds = formData.getAll("goalIds").map(String);
  const projects = listNodes("all").filter((node) => projectIds.includes(node.id) && ["project", "experience"].includes(node.type));
  if (projects.length !== new Set(projectIds).size) redirect(`/admin/records/${id}?notice=invalid-project`);
  const goals = listNodes("all").filter((node) => goalIds.includes(node.id) && ["goal", "direction"].includes(node.type));
  if (goals.length !== new Set(goalIds).size) redirect(`/admin/records/${id}?notice=invalid-goal`);
  try {
    const lines = (name: string) => String(formData.get(name) ?? "").split("\n").map((value) => value.trim()).filter(Boolean);
    updatePrivateEpisode(id, {
      kind: String(formData.get("kind") ?? "thought") as "thought" | "decision",
      title: String(formData.get("title") ?? ""), body: String(formData.get("body") ?? ""),
      context: String(formData.get("context") ?? ""), currentState: String(formData.get("currentState") ?? ""),
      goalsAndValues: String(formData.get("goalsAndValues") ?? ""), constraints: String(formData.get("constraints") ?? ""),
      options: lines("options"), expectedOutcomes: String(formData.get("expectedOutcomes") ?? ""),
      evidenceAndUncertainty: String(formData.get("evidenceAndUncertainty") ?? ""), decision: String(formData.get("decision") ?? ""),
      reasons: String(formData.get("reasons") ?? ""), rejectedOptions: lines("rejectedOptions"),
      status: String(formData.get("status") ?? "draft") as "draft" | "active" | "completed" | "archived",
      projectIds, goalIds,
      lastReviewedAt: formData.get("reviewed") === "on" ? new Date().toISOString() : null,
    });
  } catch {
    redirect(`/admin/records/${id}?notice=invalid`);
  }
  revalidatePath(`/admin/records/${id}`);
  redirect(`/admin/records/${id}?notice=saved`);
}

function parseSourceIds(value: FormDataEntryValue | null) {
  return String(value ?? "").split(",").map((part) => part.trim()).filter(Boolean);
}

export async function addPrivateSourceAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const observed = String(formData.get("observedAt") ?? "");
  try {
    addPrivateSource(id, {
      sourceType: String(formData.get("sourceType") ?? "other") as "document" | "project" | "code" | "paper" | "conversation" | "user_statement" | "experiment" | "other",
      title: String(formData.get("title") ?? ""), locator: String(formData.get("locator") ?? ""),
      observedAt: observed ? new Date(observed).toISOString() : null,
      effectiveDate: String(formData.get("effectiveDate") ?? "") || null,
      privacy: "private", verificationStatus: String(formData.get("verificationStatus") ?? "needs_review") as "candidate" | "needs_review" | "confirmed" | "stale",
      summary: String(formData.get("summary") ?? ""), scope: String(formData.get("scope") ?? ""),
    });
  } catch {
    redirect(`/admin/records/${id}?notice=invalid-source`);
  }
  revalidatePath(`/admin/records/${id}`);
  redirect(`/admin/records/${id}?notice=source-added`);
}

export async function addPrivateClaimAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "candidate") as "candidate" | "needs_review" | "confirmed" | "rejected" | "superseded" | "stale";
  try {
    addPrivateClaim(id, {
      content: String(formData.get("content") ?? ""),
      claimType: String(formData.get("claimType") ?? "self_reported") as "verified_fact" | "self_reported" | "user_judgment" | "ai_inference" | "hypothesis" | "speculative_vision" | "deprecated_belief",
      status, sourceIds: parseSourceIds(formData.get("sourceIds")), checkedAt: status === "confirmed" ? new Date().toISOString() : null,
      scope: String(formData.get("scope") ?? ""), privacy: "private", proposedBy: String(formData.get("proposedBy") ?? "user") as "user" | "ai" | "imported_source",
    });
  } catch {
    redirect(`/admin/records/${id}?notice=invalid-claim`);
  }
  revalidatePath(`/admin/records/${id}`);
  redirect(`/admin/records/${id}?notice=claim-added`);
}

export async function addPrivateActionAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    addPrivateAction(id, {
      description: String(formData.get("description") ?? ""), owner: String(formData.get("owner") ?? "user") as "user" | "ai" | "collaborator",
      authorizationLevel: String(formData.get("authorizationLevel") ?? "L0") as "L0" | "L1" | "L2" | "L3",
      status: String(formData.get("status") ?? "planned") as "planned" | "in_progress" | "done" | "cancelled",
      expectedResult: String(formData.get("expectedResult") ?? ""), actualResult: String(formData.get("actualResult") ?? ""),
      feedback: String(formData.get("feedback") ?? ""), sourceIds: parseSourceIds(formData.get("sourceIds")),
      date: String(formData.get("date") ?? "") || null,
    });
  } catch {
    redirect(`/admin/records/${id}?notice=invalid-action`);
  }
  revalidatePath(`/admin/records/${id}`);
  redirect(`/admin/records/${id}?notice=action-added`);
}

export async function addPrivateFeedbackAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    addPrivateFeedback(id, { text: String(formData.get("text") ?? ""), sourceIds: parseSourceIds(formData.get("sourceIds")) });
  } catch {
    redirect(`/admin/records/${id}?notice=invalid-feedback`);
  }
  revalidatePath(`/admin/records/${id}`);
  redirect(`/admin/records/${id}?notice=feedback-added`);
}

export async function reviewPrivateClaimAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    updatePrivateClaimStatus(
      id,
      String(formData.get("claimId") ?? ""),
      String(formData.get("status") ?? "needs_review") as "candidate" | "needs_review" | "confirmed" | "rejected" | "superseded" | "stale",
    );
  } catch {
    redirect(`/admin/records/${id}?notice=invalid-review`);
  }
  revalidatePath(`/admin/records/${id}`);
  redirect(`/admin/records/${id}?notice=claim-reviewed`);
}

export async function reviewPrivateSourceAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    updatePrivateSourceStatus(
      id,
      String(formData.get("sourceId") ?? ""),
      String(formData.get("verificationStatus") ?? "needs_review") as "candidate" | "needs_review" | "confirmed" | "stale",
    );
  } catch {
    redirect(`/admin/records/${id}?notice=invalid-review`);
  }
  revalidatePath(`/admin/records/${id}`);
  redirect(`/admin/records/${id}?notice=source-reviewed`);
}

export async function updatePrivateActionResultAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    updatePrivateActionResult(id, String(formData.get("actionId") ?? ""), {
      status: String(formData.get("status") ?? "planned") as "planned" | "in_progress" | "done" | "cancelled",
      actualResult: String(formData.get("actualResult") ?? ""),
      feedback: String(formData.get("feedback") ?? ""),
    });
  } catch {
    redirect(`/admin/records/${id}?notice=invalid-action-update`);
  }
  revalidatePath(`/admin/records/${id}`);
  redirect(`/admin/records/${id}?notice=action-updated`);
}

export async function removeNode(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) deleteNode(id);
  refresh();
  redirect("/admin?notice=deleted");
}

export async function changeVisibility(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const visibility = String(formData.get("visibility") ?? "");
  if (!id || (visibility !== "public" && visibility !== "personal")) return;
  try {
    setVisibility(id, visibility as Visibility);
  } catch {
    redirect(`/admin/nodes/${id}?notice=review-required`);
  }
  refresh();
  redirect("/admin?notice=visibility");
}

export async function reviewResumeProjection(formData: FormData) {
  await assertAdmin();
  const nodeId = String(formData.get("nodeId") ?? "");
  const selected = String(formData.get("selected") ?? "") === "true";
  const positionValue = Number(formData.get("position") ?? 0);
  if (!nodeId) redirect("/admin/resume?notice=invalid");
  if (selected && (!Number.isInteger(positionValue) || positionValue < 1)) {
    redirect("/admin/resume?notice=invalid");
  }
  try {
    setResumeProjectionNode(nodeId, selected, selected ? positionValue : undefined);
  } catch {
    redirect("/admin/resume?notice=ineligible");
  }
  revalidatePath("/resume");
  revalidatePath("/admin/resume");
  redirect("/admin/resume?notice=saved");
}

export async function saveEdge(_state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const sourceId = String(formData.get("sourceId") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const type = String(formData.get("type") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const strength = Number(formData.get("strength") ?? 0);
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  if (!getNode(sourceId) || !getNode(targetId)) return { error: "连线的两端都需要是已有节点。" };
  if (sourceId === targetId) return { error: "一条连线需要两个不同的节点。" };
  if (!edgeTypes.some((item) => item.id === type)) return { error: "未知的连接类型。" };
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) return { error: "强度从 0 到 1。" };
  if (!Number.isInteger(sortOrder)) return { error: "序号需要是整数。" };
  createEdge({
    sourceId,
    targetId,
    type,
    label,
    strength,
    sortOrder,
  });
  refresh();
  redirect("/admin?notice=edge");
}

export async function removeEdge(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) deleteEdge(id);
  refresh();
  redirect("/admin?notice=edge-deleted");
}

export async function pullRepository(_state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const input = String(formData.get("repo") ?? "");
  let id = "";
  let created = false;
  try {
    const pull = await pullGithubRepo(input, process.env.GITHUB_TOKEN);
    const existing = findNodeBySource("github", pull.externalId);
    const merged = mergeSourcePull(existing, pull);
    if (existing) {
      updateNode(existing.id, merged);
      id = existing.id;
    } else {
      id = createNode(merged);
      created = true;
    }
  } catch (error) {
    if (error instanceof GithubPullError) return { error: error.message };
    throw error;
  }
  refresh();
  redirect(`/admin/nodes/${id}?notice=${created ? "pulled" : "refreshed"}`);
}

export async function saveXiaohongshu(_state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const primaryUrl = String(formData.get("primaryUrl") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "personal");
  if (!title) return { error: "需要一个账号名称。" };
  if (!/^https?:\/\//.test(primaryUrl)) return { error: "主页需要是完整网址。" };
  if (visibility !== "public" && visibility !== "personal") return { error: "请选择公开或个人。" };
  const id = createNode({
    type: "social_account",
    title,
    summary,
    body: "",
    role: "",
    outcome: "",
    status: "",
    timeStart: null,
    timeEnd: null,
    scale: 0,
    importance: 0,
    centrality: 0,
    visibility,
    primaryUrl,
    exitLinks: [],
    categoryIds: [],
    sourceKind: "xiaohongshu",
    sourceExternalId: primaryUrl,
    sourcePrivate: false,
    sourceSnapshot: null,
  });
  refresh();
  redirect(`/admin/nodes/${id}?notice=saved`);
}
