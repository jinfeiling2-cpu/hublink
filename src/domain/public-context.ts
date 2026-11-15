import crypto from "node:crypto";
import { profile, resume } from "../content/profile";
import { visibleGraph } from "./graph";
import { edgeTypeById, nodeTypeById } from "./registry";
import type { EdgeRecord, NodeRecord } from "./types";

export function buildPublicContext(inputNodes: NodeRecord[], inputEdges: EdgeRecord[], baseUrl: string) {
  const graph = visibleGraph(inputNodes, inputEdges, "public");
  const pathFor = (id: string) => "/node/" + encodeURIComponent(id);
  const nodes = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id)).map((node) => ({
    id: node.id, type: node.type, typeLabel: nodeTypeById(node.type)?.label ?? node.type,
    title: node.title, summary: node.summary, body: node.body,
    role: node.role || null, outcome: node.outcome || null, status: node.status || null,
    timeStart: node.timeStart, timeEnd: node.timeEnd,
    importance: node.importance, centrality: node.centrality, scale: node.scale,
    categoryIds: [...node.categoryIds].sort(), primaryUrl: node.primaryUrl || null,
    exitLinks: node.exitLinks, url: pathFor(node.id),
  }));
  const edges = [...graph.edges].sort((a, b) => a.id.localeCompare(b.id)).map((edge) => ({
    id: edge.id, sourceId: edge.sourceId, targetId: edge.targetId, type: edge.type,
    typeLabel: edgeTypeById(edge.type)?.label ?? edge.type,
    typeDescription: edgeTypeById(edge.type)?.description ?? null,
    label: edge.label || null, strength: edge.strength,
    sourceUrl: pathFor(edge.sourceId), targetUrl: pathFor(edge.targetId),
  }));
  const content = {
    schemaVersion: "hublink-context-v1",
    subject: { id: "person.public", name: profile.nameZh, alternateName: profile.nameEn, url: "/" },
    purpose: profile.sitePurpose, direction: profile.direction, alignmentAim: profile.alignmentAim,
    doctoralTargetFramework: profile.doctoralFramework, boundary: profile.siteBoundary,
    scope: "public" as const,
    readingPaths: profile.readingPaths.map((path) => ({ ...path, url: path.href })),
    resume: { ...resume, url: "/resume", basis: "当前简历整理版；不是外部独立核验；论文动态进度未在本版登记。" },
    limitations: [
      "仅包含当前可见性为 public 的节点，以及两端都公开的连接。",
      "不包含原始语料、审核历史、未批准候选或私人来源摘录。",
      "节点 URL 是站内继续阅读入口，不代表每条内容都已有独立外部证据链接。",
      "status 是图谱登记的状态；可能来自较早整理，不据此补写论文或博士进度。空值表示未记录。",
      "关系类型解释语义范围；连接本身不自动证明因果或目标已经达成。",
      "publicationVersion 是公开投影的内容指纹，尚不代表已有可回滚的发布批次或历史快照。",
    ],
    nodes, edges,
  };
  const publicationVersion = "pub-" + crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex").slice(0, 16);
  const absolute = (path: string) => new URL(path, baseUrl).toString();
  return {
    ...content, publicationVersion, generatedAt: new Date().toISOString(),
    subject: { ...content.subject, url: absolute(content.subject.url) },
    resume: { ...content.resume, url: absolute(content.resume.url) },
    readingPaths: content.readingPaths.map((path) => ({ ...path, url: absolute(path.url) })),
    nodes: nodes.map((node) => ({ ...node, url: absolute(node.url) })),
    edges: edges.map((edge) => ({ ...edge, sourceUrl: absolute(edge.sourceUrl), targetUrl: absolute(edge.targetUrl) })),
  };
}
