import type { NodeRecord } from "@/domain/types";

export type ResumeProjectionChoice = {
  nodeId: string;
  position: number;
  selected: boolean;
  reviewedAt: string;
};

export type ResumeCandidate = {
  node: NodeRecord;
  reasons: string[];
  cautions: string[];
  score: number;
  selected: boolean;
  position: number;
  reviewedAt: string | null;
};

export type ResumeCandidateProvider = {
  recommend(nodes: NodeRecord[]): ResumeCandidate[];
};

function recommendationFor(node: NodeRecord, choice?: ResumeProjectionChoice): ResumeCandidate {
  const reasons: string[] = [];
  const cautions: string[] = [];
  let score = 0;
  if (node.summary.trim()) {
    reasons.push("有公开项目简介");
    score += 1;
  }
  if (node.role.trim()) {
    reasons.push("已填写参与角色");
    score += 1;
  } else {
    cautions.push("缺少个人角色，不能说明本人做了什么");
  }
  if (node.outcome.trim()) {
    reasons.push("有结果或阶段说明");
    score += 1;
  } else {
    cautions.push("缺少结果或阶段说明");
  }
  if (!node.timeStart && !node.timeEnd) cautions.push("没有时间范围");
  if (node.status === "exploring") cautions.push("节点状态是探索中，需确认是否适合正式简历");
  return {
    node,
    reasons,
    cautions,
    score,
    selected: choice?.selected ?? false,
    position: choice?.position ?? Number.MAX_SAFE_INTEGER,
    reviewedAt: choice?.reviewedAt ?? null,
  };
}

// Recommendation is explanatory only; publication always requires a saved human choice.
export const localResumeCandidateProvider: ResumeCandidateProvider = {
  recommend(nodes) {
    return nodes
      .filter((node) => node.type === "project" && node.visibility === "public" && !node.sourcePrivate)
      .map((node) => recommendationFor(node))
      .sort((a, b) => b.score - a.score || a.node.title.localeCompare(b.node.title));
  },
};

export function listResumeCandidates(nodes: NodeRecord[], choices: ResumeProjectionChoice[] = []) {
  const choiceById = new Map(choices.map((choice) => [choice.nodeId, choice]));
  return localResumeCandidateProvider.recommend(nodes).map((candidate) => {
    const choice = choiceById.get(candidate.node.id);
    return choice
      ? { ...candidate, selected: choice.selected, position: choice.position, reviewedAt: choice.reviewedAt }
      : candidate;
  });
}

export function buildResumeProjection(nodes: NodeRecord[], choices: ResumeProjectionChoice[]) {
  const selected = new Map(
    listResumeCandidates(nodes, choices)
      .filter((candidate) => candidate.selected)
      .map((candidate) => [candidate.node.id, candidate]),
  );
  return choices
    .filter((choice) => choice.selected)
    .sort((a, b) => a.position - b.position || a.nodeId.localeCompare(b.nodeId))
    .map((choice) => selected.get(choice.nodeId))
    .filter((candidate): candidate is ResumeCandidate => Boolean(candidate));
}
