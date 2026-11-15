import { categories, type DimensionDefinition, type TraverseConfig } from "./registry";
import type {
  EdgeRecord,
  MeasureKey,
  NodeInput,
  NodeRecord,
  SourcePull,
  Visibility,
} from "./types";

export function visibilityForSource(sourcePrivate: boolean): Visibility {
  return sourcePrivate ? "personal" : "public";
}

export function visibleGraph(nodes: NodeRecord[], edges: EdgeRecord[], scope: "public" | "all") {
  if (scope === "all") return { nodes, edges };
  const ids = new Set(nodes.filter((node) => node.visibility === "public").map((node) => node.id));
  return {
    nodes: nodes.filter((node) => ids.has(node.id)),
    edges: edges.filter((edge) => ids.has(edge.sourceId) && ids.has(edge.targetId)),
  };
}

export function degreeOf(nodeId: string, edges: EdgeRecord[]) {
  return edges.filter((edge) => edge.sourceId === nodeId || edge.targetId === nodeId).length;
}

export function timeNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value.length === 7 ? `${value}-01T00:00:00Z` : value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function measureValue(node: NodeRecord, edges: EdgeRecord[], key: MeasureKey): number | null {
  if (key === "time") return timeNumber(node.timeStart);
  if (key === "scale") return node.scale;
  if (key === "importance") return node.importance;
  if (key === "centrality") return node.centrality;
  return degreeOf(node.id, edges);
}

export function rankNodes(
  nodes: NodeRecord[],
  edges: EdgeRecord[],
  key: MeasureKey,
  direction: "asc" | "desc" = "desc",
) {
  return [...nodes].sort((a, b) => {
    const av = measureValue(a, edges, key);
    const bv = measureValue(b, edges, key);
    if (av === null && bv === null) return a.title.localeCompare(b.title, "zh");
    if (av === null) return 1;
    if (bv === null) return -1;
    const delta = av - bv;
    if (delta !== 0) return direction === "asc" ? delta : -delta;
    return a.title.localeCompare(b.title, "zh");
  });
}

export function impressionSelection(nodes: NodeRecord[], edges: EdgeRecord[]) {
  const pick = (type: string, key: MeasureKey, limit: number) =>
    rankNodes(
      nodes.filter((node) => node.type === type),
      edges,
      key,
    ).slice(0, limit);
  const coreDirection = rankNodes(nodes.filter((node) => node.type === "direction"), edges, "centrality")[0] ?? null;
  const coreProjects = coreDirection
    ? edges.filter((edge) => edge.sourceId !== coreDirection.id && edge.targetId === coreDirection.id
      && ["related_to", "embodies", "contributes_to"].includes(edge.type))
      .map((edge) => ({ node: nodes.find((node) => node.id === edge.sourceId && node.type === "project"), strength: edge.strength }))
      .filter((item): item is { node: NodeRecord; strength: number } => Boolean(item.node))
      .sort((a, b) => b.strength - a.strength || b.node.importance - a.node.importance || a.node.title.localeCompare(b.node.title, "zh"))
      .map((item) => item.node)
    : [];

  return {
    person: nodes.find((node) => node.id === "person.public" && node.type === "person")
      ?? pick("person", "centrality", 1)[0] ?? null,
    coreDirection,
    directions: pick("direction", "centrality", 3),
    projects: coreProjects.length ? coreProjects.slice(0, 3) : pick("project", "importance", 3),
    experiences: pick("experience", "time", 4),
  };
}

export type TraverseHit = {
  id: string;
  via: string | null;
  edgeId: string | null;
  children: TraverseHit[];
};

export function traverseTree(
  rootId: string,
  edges: EdgeRecord[],
  edgeTypes: string[],
  maxDepth: number,
): TraverseHit {
  const walk = (id: string, via: string | null, edgeId: string | null, depth: number, seen: Set<string>): TraverseHit => {
    const nextSeen = new Set(seen);
    nextSeen.add(id);
    if (depth >= maxDepth) return { id, via, edgeId, children: [] };
    const children = edges
      .filter((edge) => edge.sourceId === id && edgeTypes.includes(edge.type) && !nextSeen.has(edge.targetId))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.type.localeCompare(b.type))
      .map((edge) => walk(edge.targetId, edge.type, edge.id, depth + 1, nextSeen));
    return { id, via, edgeId, children };
  };
  return walk(rootId, null, null, 0, new Set());
}

export function rootsForTraverse(nodes: NodeRecord[], config: TraverseConfig) {
  return rankNodes(
    nodes.filter((node) => node.type === config.rootType),
    [],
    "importance",
  );
}

export function groupByCategory(nodes: NodeRecord[], group: string, defs: DimensionDefinition[] = categories) {
  const dims = defs.filter((item) => item.kind === "category" && item.group === group);
  return {
    groups: dims.map((dim) => ({
      id: dim.id,
      label: dim.label,
      nodes: nodes.filter((node) => node.categoryIds.includes(dim.id)),
    })),
    ungrouped: nodes.filter((node) => !dims.some((dim) => node.categoryIds.includes(dim.id))),
  };
}

export type AxisPoint = {
  id: string;
  title: string;
  x: number;
  y: number;
  z: number;
};

export function toAxisPoints(
  nodes: NodeRecord[],
  edges: EdgeRecord[],
  x: MeasureKey,
  y: MeasureKey,
  z: MeasureKey,
): AxisPoint[] {
  const keys: MeasureKey[] = [x, y, z];
  const ranges = keys.map((key) => {
    const values = nodes
      .map((node) => measureValue(node, edges, key))
      .filter((value): value is number => value !== null);
    if (values.length === 0) return { min: 0, span: 1 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, span: max === min ? 1 : max - min };
  });

  return nodes.map((node, index) => {
    const raw = keys.map((key) => measureValue(node, edges, key));
    const coords = raw.map((value, axis) => {
      if (value === null) return 0.08;
      return (value - ranges[axis].min) / ranges[axis].span;
    });
    const nudge = nodes.length > 1 ? (index % 5) * 0.012 : 0;
    return {
      id: node.id,
      title: node.title,
      x: clamp01(coords[0] + nudge),
      y: clamp01(coords[1]),
      z: clamp01(coords[2]),
    };
  });
}

export function mergeSourcePull(existing: NodeRecord | null, pull: SourcePull): NodeInput {
  if (!existing) {
    return {
      type: "project",
      title: pull.suggestedTitle,
      summary: pull.suggestedSummary,
      body: "",
      role: "",
      outcome: "",
      status: "",
      timeStart: null,
      timeEnd: null,
      scale: 0,
      importance: 0,
      centrality: 0,
      visibility: visibilityForSource(pull.sourcePrivate),
      primaryUrl: pull.primaryUrl,
      exitLinks: [],
      categoryIds: [],
      sourceKind: pull.sourceKind,
      sourceExternalId: pull.externalId,
      sourcePrivate: pull.sourcePrivate,
      sourceSnapshot: pull.snapshot,
    };
  }

  return {
    type: existing.type,
    title: existing.title,
    summary: existing.summary,
    body: existing.body,
    role: existing.role,
    outcome: existing.outcome,
    status: existing.status,
    timeStart: existing.timeStart,
    timeEnd: existing.timeEnd,
    scale: existing.scale,
    importance: existing.importance,
    centrality: existing.centrality,
    visibility: existing.visibility,
    primaryUrl: existing.primaryUrl || pull.primaryUrl,
    exitLinks: existing.exitLinks,
    categoryIds: existing.categoryIds,
    sourceKind: pull.sourceKind,
    sourceExternalId: pull.externalId,
    sourcePrivate: pull.sourcePrivate,
    sourceSnapshot: pull.snapshot,
  };
}

export function publicSnapshot(snapshot: NodeRecord["sourceSnapshot"], sourcePrivate = false) {
  if (!snapshot || sourcePrivate) return null;
  return {
    htmlUrl: snapshot.htmlUrl ?? null,
    revision: snapshot.revision ?? null,
    branch: snapshot.branch ?? null,
    description: snapshot.description ?? "",
    language: snapshot.language ?? null,
    topics: snapshot.topics ?? [],
    stars: snapshot.stars ?? null,
    forks: snapshot.forks ?? null,
    pushedAt: snapshot.pushedAt ?? null,
    license: snapshot.license ?? null,
    homepage: snapshot.homepage ?? null,
    fetchedAt: snapshot.fetchedAt,
  };
}

function clamp01(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
