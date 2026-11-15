import { createHash } from "node:crypto";
import { edgeTypes, nodeTypes } from "./registry";
import type { EdgeRecord, NodeInput } from "./types";

export type GithubReadingNode = NodeInput & { id: string };
export type GithubReadingGraph = { nodes: GithubReadingNode[]; edges: EdgeRecord[] };
export type GithubReadingSource = {
  repository: string;
  private: boolean;
  commit: string;
  fetchedAt: string;
  branch: string;
  readingMode: "documents_only" | "architecture";
  treeTruncated: boolean;
  files: { path: string; contentHash: string; text: string }[];
};

// Validation runs before database writes; source refreshes never silently approve old readings.
export function validateGithubReading(graph: GithubReadingGraph, sources: GithubReadingSource[], existingIds: string[]) {
  const ids = new Set(existingIds);
  const sourceByRepo = new Map(sources.map((source) => [source.repository.toLowerCase(), source]));
  const seen = new Set<string>();
  for (const source of sources) {
    for (const file of source.files) {
      const hash = createHash("sha256").update(file.text).digest("hex");
      if (hash !== file.contentHash) throw new Error(`Source content changed: ${source.repository}`);
    }
    if (source.private && (source.readingMode !== "documents_only" || "tree" in source)) {
      throw new Error(`Private repository must contain documents only: ${source.repository}`);
    }
  }
  for (const node of graph.nodes) {
    if (seen.has(node.id)) throw new Error(`Duplicate node: ${node.id}`);
    seen.add(node.id);
    ids.add(node.id);
    if (!nodeTypes.some((type) => type.id === node.type)) throw new Error(`Unknown node type: ${node.type}`);
    if (node.sourceKind !== "github") continue;
    const repo = node.sourceExternalId.split("#")[0];
    const source = sourceByRepo.get(repo.toLowerCase());
    if (!source || source.private !== node.sourcePrivate) throw new Error(`Missing or changed source visibility: ${repo}`);
    if (source.treeTruncated) throw new Error(`Truncated source tree: ${repo}`);
    const root = graph.nodes.find((item) => item.sourceKind === "github" && item.sourceExternalId === repo);
    if (!root?.sourceSnapshot?.revision || root.sourceSnapshot.revision !== source.commit) {
      throw new Error(`Reading must be revised for the current commit: ${repo}`);
    }
    if (source.private && (node.type !== "project" || node.sourceExternalId.includes("#"))) {
      throw new Error(`Private repository cannot generate program structure: ${repo}`);
    }
    for (const value of [node.scale, node.importance, node.centrality]) {
      if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`Invalid node weight: ${node.id}`);
    }
  }
  const privateIds = new Set(graph.nodes.filter((node) => node.sourcePrivate).map((node) => node.id));
  const seenEdges = new Set<string>();
  for (const edge of graph.edges) {
    if (seenEdges.has(edge.id)) throw new Error(`Duplicate edge: ${edge.id}`);
    seenEdges.add(edge.id);
    if (!ids.has(edge.sourceId) || !ids.has(edge.targetId)) throw new Error(`Dangling edge: ${edge.id}`);
    if (!edgeTypes.some((type) => type.id === edge.type)) throw new Error(`Unknown edge type: ${edge.type}`);
    if (!edge.label.trim() || !Number.isFinite(edge.strength) || edge.strength < 0 || edge.strength > 1) {
      throw new Error(`Missing relationship rationale or invalid weight: ${edge.id}`);
    }
    if ((privateIds.has(edge.sourceId) || privateIds.has(edge.targetId))
      && ["contains", "implements", "depends_on", "feeds", "step"].includes(edge.type)) {
      throw new Error(`Private repository cannot have program-structure edges: ${edge.id}`);
    }
  }
  return { nodes: graph.nodes.length, edges: graph.edges.length, repositories: sourceByRepo.size };
}
