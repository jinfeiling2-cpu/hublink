export type NetworkNodeInput = {
  id: string;
  title: string;
  type: string;
  summary: string;
  importance: number;
  centrality: number;
  degree: number;
  scale: number;
  timeStart: string | null;
  categoryIds: string[];
};

export type NetworkEdgeInput = {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  strength: number | null;
};

export function toNetworkData(
  nodes: Array<{ id: string; title: string; type: string; summary: string; importance: number; centrality: number; scale?: number; timeStart?: string | null; categoryIds?: string[] }>,
  edges: Array<{ id: string; sourceId: string; targetId: string; type: string; label?: string; strength?: number }>,
): { nodes: NetworkNodeInput[]; edges: NetworkEdgeInput[] } {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      title: node.title,
      type: node.type,
      summary: node.summary,
      importance: node.importance,
      centrality: node.centrality,
      degree: edges.filter((edge) => edge.sourceId === node.id || edge.targetId === node.id).length,
      scale: node.scale ?? 0,
      timeStart: node.timeStart ?? null,
      categoryIds: [...(node.categoryIds ?? [])],
    })),
    edges: edges.map((edge) => ({ id: edge.id, source: edge.sourceId, target: edge.targetId, type: edge.type, label: edge.label ?? "", strength: edge.strength ?? null })),
  };
}
