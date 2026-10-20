import { degreeOf } from "@/domain/graph";
import { edgeTypeById, measureLabel, nodeTypeById, statusLabel } from "@/domain/registry";
import type { EdgeRecord, MeasureKey, NodeRecord } from "@/domain/types";

export function typeLabel(id: string) {
  return nodeTypeById(id)?.label ?? id;
}

export function edgeLabel(id: string) {
  return edgeTypeById(id)?.label ?? id;
}

export function visibilityLabel(visibility: NodeRecord["visibility"]) {
  return visibility === "public" ? "公开" : "个人";
}

export function whenLabel(node: NodeRecord) {
  if (node.timeStart && node.timeEnd && node.timeEnd !== node.timeStart) {
    return `${node.timeStart} – ${node.timeEnd}`;
  }
  return node.timeStart || "时间未注";
}

export function measureText(node: NodeRecord, edges: EdgeRecord[], key: MeasureKey) {
  if (key === "time") return whenLabel(node);
  if (key === "degree") return `${degreeOf(node.id, edges)} 条连线`;
  const value = key === "scale" ? node.scale : key === "importance" ? node.importance : node.centrality;
  return `${measureLabel(key)} ${trimNumber(value)}`;
}

export function trimNumber(value: number) {
  return String(Math.round(value * 100) / 100);
}

export function statusText(id: string) {
  return statusLabel(id);
}
