import type { NetworkEdgeInput, NetworkNodeInput } from "../lib/network";
import type { MeasureKey } from "./types";

export type SpatialProjection = "radial" | "axes";
export type SpatialAxes = { x: MeasureKey; y: MeasureKey; z: MeasureKey };
export type RadialMeasure = "centrality" | "importance" | "scale" | "degree";
export const defaultSpatialAxes: SpatialAxes = { x: "importance", y: "scale", z: "centrality" };

export const spatialSectors = [
  { id: "research", label: "研究", categories: ["activity.research"], angle: 135, span: 68, color: "#64c9ed" },
  { id: "making", label: "制作", categories: ["activity.making"], angle: 45, span: 68, color: "#e3b569" },
  { id: "writing", label: "写作", categories: ["activity.writing"], angle: -45, span: 68, color: "#9dcb8d" },
  { id: "teaching", label: "教学 / 组织", categories: ["activity.teaching", "activity.organizing"], angle: -135, span: 58, color: "#eb9d8c" },
  { id: "unclassified", label: "活动未分类", categories: [] as string[], angle: 180, span: 18, color: "#a4afb8" },
];

export type SpatialNode = NetworkNodeInput & {
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  sector: string;
  categoryBasis: "explicit" | "inherited" | "missing";
  missing: MeasureKey[];
};

export type SpatialLayout = {
  nodes: SpatialNode[];
  edges: NetworkEdgeInput[];
  anchorId: string | null;
  projection: SpatialProjection;
  axes: SpatialAxes;
  ranges: Record<MeasureKey, { min: number; max: number } | null>;
};

export function spatialMeasure(node: NetworkNodeInput, key: MeasureKey): number | null {
  if (key !== "time") return Number.isFinite(node[key]) ? node[key] : null;
  if (!node.timeStart) return null;
  const time = Date.parse(node.timeStart.length === 7 ? `${node.timeStart}-01T00:00:00Z` : node.timeStart);
  return Number.isFinite(time) ? time : null;
}

export function edgeWidth(strength: number | null) {
  return strength === null ? 0.8 : 0.8 + Math.max(0, Math.min(1, strength)) * 3.2;
}

export function buildSpatialLayout(
  inputNodes: NetworkNodeInput[],
  inputEdges: NetworkEdgeInput[],
  options: { projection?: SpatialProjection; axes?: SpatialAxes; radialBy?: RadialMeasure } = {},
): SpatialLayout {
  const projection = options.projection ?? "radial";
  const axes = options.axes ?? defaultSpatialAxes;
  const radialBy = options.radialBy ?? "centrality";
  const nodes = [...inputNodes].sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges = inputEdges.filter((edge) => byId.has(edge.source) && byId.has(edge.target)).sort((a, b) => a.id.localeCompare(b.id));
  const anchor = nodes.filter((node) => node.type === "person")
    .sort((a, b) => Number(b.id === "person.public") - Number(a.id === "person.public")
      || b.centrality - a.centrality || b.importance - a.importance || a.id.localeCompare(b.id))[0];
  const keys: MeasureKey[] = ["importance", "centrality", "scale", "degree", "time"];
  const ranges = Object.fromEntries(keys.map((key) => {
    const values = nodes.filter((node) => node.id !== anchor?.id).map((node) => spatialMeasure(node, key)).filter((value): value is number => value !== null);
    return [key, values.length ? { min: Math.min(...values), max: Math.max(...values) } : null];
  })) as SpatialLayout["ranges"];
  const normalized = (node: NetworkNodeInput, key: MeasureKey) => {
    const value = spatialMeasure(node, key);
    if (value === null) return null;
    if (key === "time" || key === "degree") {
      const range = ranges[key];
      return !range || range.max === range.min ? 0.5 : (value - range.min) / (range.max - range.min);
    }
    return Math.max(0, Math.min(1, value));
  };
  const parents = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type !== "contains") continue;
    parents.set(edge.target, [...(parents.get(edge.target) ?? []), edge.source].sort());
  }
  const classify = (node: NetworkNodeInput) => {
    const seen = new Set<string>([node.id]);
    let frontier = [node.id];
    while (frontier.length) {
      for (const id of frontier) {
        const item = byId.get(id)!;
        const sector = spatialSectors.find((sector) => sector.categories.some((category) => item.categoryIds.includes(category)));
        if (sector) return { sector, basis: id === node.id ? "explicit" as const : "inherited" as const };
      }
      const next: string[] = [];
      for (const id of frontier) for (const parent of parents.get(id) ?? []) {
        if (!seen.has(parent)) { seen.add(parent); next.push(parent); }
      }
      frontier = next.sort();
    }
    return { sector: spatialSectors[spatialSectors.length - 1], basis: "missing" as const };
  };
  const classified = new Map(nodes.map((node) => [node.id, classify(node)]));
  const members = new Map(spatialSectors.map((sector) => [sector.id, nodes.filter((node) => node.id !== anchor?.id && classified.get(node.id)!.sector.id === sector.id)]));
  const positioned = nodes.map((node): SpatialNode => {
    const { sector, basis } = classified.get(node.id)!;
    const missing = [...new Set([axes.x, axes.y, axes.z].filter((key) => normalized(node, key) === null))];
    if (node.id === anchor?.id) return { ...node, x: 0, y: 0, z: 0, radius: 38, color: "#f0c97a", sector: sector.id, categoryBasis: basis, missing: [] };
    let x: number;
    let y: number;
    const depth = normalized(node, axes.z);
    const z = depth === null ? -1080 : (depth - 0.5) * 1600;
    if (projection === "radial") {
      const group = members.get(sector.id)!;
      const index = group.findIndex((item) => item.id === node.id);
      const angle = (sector.angle + ((index + 0.5) / group.length - 0.5) * sector.span) * Math.PI / 180;
      const distance = 180 + (1 - (normalized(node, radialBy) ?? 0)) * 1000;
      x = Math.cos(angle) * distance;
      y = Math.sin(angle) * distance;
    } else {
      const horizontal = normalized(node, axes.x);
      const vertical = normalized(node, axes.y);
      x = horizontal === null ? 1080 : (horizontal - 0.5) * 1600;
      y = vertical === null ? -1080 : (vertical - 0.5) * 1600;
    }
    return { ...node, x, y, z, radius: 8 + Math.max(0, Math.min(1, node.importance)) * 13, color: sector.color, sector: sector.id, categoryBasis: basis, missing };
  });
  return { nodes: positioned, edges, anchorId: anchor?.id ?? null, projection, axes, ranges };
}
