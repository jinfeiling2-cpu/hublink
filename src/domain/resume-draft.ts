import { z } from "zod";
import type { ContributionReviewStatus, NodeRecord } from "./types";

const sourceRefSchema = z.string().trim().min(1).max(500);
const targetFitSchema = z.enum(["unset", "high", "medium", "low"]);
const reviewStateSchema = z.enum(["candidate", "needs_review", "owner_confirmed", "rejected"]);

export const resumeTargetSchema = z.object({
  kind: z.enum(["general", "job_description"]).default("general"),
  company: z.string().max(200).default(""),
  jobDescription: z.string().max(20000).default(""),
  domain: z.string().max(300).default(""),
  seniority: z.string().max(120).default(""),
  location: z.string().max(200).default(""),
  language: z.string().max(120).default(""),
  generalLabel: z.string().max(300).default("通用方向草稿"),
}).default({ kind: "general", company: "", jobDescription: "", domain: "", seniority: "", location: "", language: "", generalLabel: "通用方向草稿" });

export const resumeRequirementSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(["responsibility", "required_skill", "preferred_skill", "domain_experience", "evidence_expectation", "inferred"]),
  text: z.string().trim().min(1).max(1000),
  evidenceExpectation: z.string().max(1000),
  origin: z.enum(["job_description", "owner_inference", "general_direction"]),
});

export const resumeFactSchema = z.object({
  text: z.string().max(3000),
  sourceRefs: z.array(sourceRefSchema).max(20),
  reviewStatus: reviewStateSchema,
});

const emptyFact = { text: "", sourceRefs: [] as string[], reviewStatus: "needs_review" as const };
const resumePersonalSectionsSchema = z.object({
  name: resumeFactSchema.default(emptyFact),
  contact: resumeFactSchema.default(emptyFact),
  positioning: resumeFactSchema.default(emptyFact),
  education: z.array(resumeFactSchema).max(10).default([]),
  researchInterests: resumeFactSchema.default(emptyFact),
  publications: z.array(resumeFactSchema).max(30).default([]),
  skills: z.array(resumeFactSchema).max(50).default([]),
  otherExperience: z.array(resumeFactSchema).max(30).default([]),
});

const defaultSections = {
  name: emptyFact, contact: emptyFact, positioning: emptyFact, education: [], researchInterests: emptyFact,
  publications: [], skills: [], otherExperience: [],
};

export const resumeContributionItemSchema = z.object({
  sourceNodeId: z.string().min(1),
  text: z.string().max(1200),
  sourceRefs: z.array(sourceRefSchema).max(20),
  reviewStatus: z.enum(["system_verified", "owner_unconfirmed", "owner_confirmed"]),
  targetFit: targetFitSchema,
  selectionReason: z.string().max(1000).default(""),
  requirementRefs: z.array(z.string().max(100)).max(50).default([]),
  variant: z.enum(["technical", "results", "research", "engineering"]).default("engineering"),
});

export const resumeEntrySchema = z.object({
  sourceNodeId: z.string().min(1),
  kind: z.enum(["project", "experience"]),
  title: z.string().trim().min(1).max(120),
  role: z.string().max(160),
  summary: z.string().max(1000),
  timeStart: z.string().max(20).nullable(),
  timeEnd: z.string().max(20).nullable(),
  sourceRefs: z.array(sourceRefSchema).max(20),
  targetFit: targetFitSchema,
  contributions: z.array(resumeContributionItemSchema).max(50),
  selectionReason: z.string().max(1000).default(""),
  requirementRefs: z.array(z.string().max(100)).max(50).default([]),
});

export const resumeDraftContentSchema = z.object({
  entries: z.array(resumeEntrySchema).max(100),
  target: resumeTargetSchema,
  requirements: z.array(resumeRequirementSchema).max(100).default([]),
  sections: resumePersonalSectionsSchema.default(defaultSections),
  omittedProjectNotes: z.string().max(5000).default(""),
});

export const resumeDraftInputSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  targetRole: z.string().trim().min(1).max(240),
  content: resumeDraftContentSchema,
});

export type ResumeDraftContent = z.infer<typeof resumeDraftContentSchema>;
export type ResumeDraft = z.infer<typeof resumeDraftInputSchema> & { updatedAt: string };

export type ResumeCandidate = {
  node: Pick<NodeRecord, "id" | "type" | "title" | "summary" | "body" | "role" | "outcome" | "status" | "timeStart" | "timeEnd" | "visibility" | "primaryUrl" | "exitLinks" | "contributionReview">;
  evidence: string[];
  missing: string[];
};

export type ResumeCandidateGroup = {
  project: ResumeCandidate;
  contributions: ResumeCandidate[];
};

export type ResumeRequirement = z.infer<typeof resumeRequirementSchema>;

export function resumeCandidateGroups(nodes: NodeRecord[], edges: { sourceId: string; targetId: string; type: string; sortOrder: number }[]): ResumeCandidateGroup[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const projects = nodes.filter((node) => node.type === "project" || node.type === "experience");
  return projects.map((project) => ({
    project: candidate(project),
    contributions: edges
      .filter((edge) => edge.type === "contribution_to" && edge.targetId === project.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.sourceId.localeCompare(b.sourceId))
      .map((edge) => byId.get(edge.sourceId))
      .filter((node): node is NodeRecord => Boolean(node && node.type === "contribution"))
      .map(candidate),
  }));
}

function candidate(node: NodeRecord): ResumeCandidate {
  const evidence = [
    ...node.exitLinks.map((link) => `${link.label}: ${link.url}`),
    ...(node.primaryUrl ? [node.primaryUrl] : []),
    ...(node.body ? ["节点说明中记录了实现或来源上下文"] : []),
  ];
  const missing = [
    ...(!node.summary ? ["缺少简短背景/行动说明"] : []),
    ...(!node.role ? ["个人角色尚未填写"] : []),
    ...(!node.outcome ? ["结果或当前阶段尚未填写"] : []),
    ...(!node.timeStart && !node.timeEnd ? ["时间范围尚未填写"] : []),
    ...(node.type === "contribution" && node.contributionReview !== "owner_confirmed" ? ["个人归属待本人确认"] : []),
    ...(evidence.length === 0 ? ["尚未记录证据出口或来源说明"] : []),
  ];
  return {
    node: {
      id: node.id, type: node.type, title: node.title, summary: node.summary, body: node.body,
      role: node.role, outcome: node.outcome, status: node.status, timeStart: node.timeStart,
      timeEnd: node.timeEnd, visibility: node.visibility, primaryUrl: node.primaryUrl,
      exitLinks: node.exitLinks, contributionReview: node.contributionReview,
    },
    evidence,
    missing,
  };
}

export function statusLabel(status: ContributionReviewStatus | null | undefined) {
  if (status === "system_verified") return "系统事实已由代码/资料确认；个人归属仍未核验";
  if (status === "owner_confirmed") return "本人已确认个人贡献";
  return "个人行动与归属待本人确认";
}

export function validateResumeDraftContent(
  value: unknown,
  nodes: NodeRecord[],
  edges: { sourceId: string; targetId: string; type: string }[],
) {
  const content = resumeDraftContentSchema.parse(value);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const entries = content.entries.map((entry) => {
    const parent = byId.get(entry.sourceNodeId);
    if (!parent || parent.type !== entry.kind) throw new Error("简历条目的项目或经历来源已不存在或类型不符。");
    const contributions = entry.contributions.map((item) => {
      const contribution = byId.get(item.sourceNodeId);
      const linked = edges.some((edge) => edge.type === "contribution_to" && edge.sourceId === item.sourceNodeId && edge.targetId === entry.sourceNodeId);
      if (!contribution || contribution.type !== "contribution" || !linked) throw new Error("所选贡献必须是关联到该项目或经历的个人贡献节点。");
      return { ...item, reviewStatus: contribution.contributionReview ?? "owner_unconfirmed" };
    });
    return { ...entry, contributions };
  });
  const requirementIds = new Set(content.requirements.map((requirement) => requirement.id));
  const validRefs = (refs: string[]) => refs.every((id) => requirementIds.has(id));
  if (entries.some((entry) => !validRefs(entry.requirementRefs) || entry.contributions.some((item) => !validRefs(item.requirementRefs)))) {
    throw new Error("简历条目引用了不存在的岗位要求。");
  }
  return { ...content, entries };
}

export function analyzeResumeCoverage(content: ResumeDraftContent) {
  const mapped = new Set<string>();
  for (const entry of content.entries) {
    entry.requirementRefs.forEach((id) => mapped.add(id));
    entry.contributions.forEach((item) => item.requirementRefs.forEach((id) => mapped.add(id)));
  }
  return content.requirements.map((requirement) => ({
    requirement,
    covered: mapped.has(requirement.id),
    inferred: requirement.origin === "owner_inference" || requirement.kind === "inferred",
  }));
}
