import assert from "node:assert/strict";
import test from "node:test";
import { buildSpatialLayout, edgeWidth } from "./spatial";
import type { NetworkEdgeInput, NetworkNodeInput } from "@/lib/network";

const node = (id: string, partial: Partial<NetworkNodeInput> = {}): NetworkNodeInput => ({
  id, title: id, type: "project", summary: "", importance: 0.5, centrality: 0.5, degree: 0,
  scale: 0.5, timeStart: null, categoryIds: [], ...partial,
});
const edge = (id: string, source: string, target: string, strength: number | null): NetworkEdgeInput => ({ id, source, target, type: "related_to", label: "", strength });

test("固定空间布局以人物为锚点，并让关联度决定径向远近", () => {
  const nodes = [
    node("person", { type: "person", centrality: 1, importance: 1 }),
    node("near", { centrality: 0.9, categoryIds: ["activity.research"] }),
    node("far", { centrality: 0.2, categoryIds: ["activity.making"] }),
  ];
  const first = buildSpatialLayout(nodes, [], { projection: "radial", radialBy: "centrality" });
  const second = buildSpatialLayout(nodes, [], { projection: "radial", radialBy: "centrality" });
  const origin = first.nodes.find((item) => item.id === "person")!;
  const near = first.nodes.find((item) => item.id === "near")!;
  const far = first.nodes.find((item) => item.id === "far")!;
  assert.deepEqual(origin && [origin.x, origin.y, origin.z], [0, 0, 0]);
  assert.ok(Math.hypot(near.x, near.y) < Math.hypot(far.x, far.y));
  assert.deepEqual(first.nodes.map((item) => [item.id, item.x, item.y, item.z]), second.nodes.map((item) => [item.id, item.x, item.y, item.z]));
});

test("维度投影保留缺失值标记，关系权重映射到线宽", () => {
  const layout = buildSpatialLayout([node("person", { type: "person" }), node("missing", { timeStart: null })], [edge("e", "person", "missing", 0.8)], { projection: "axes", axes: { x: "time", y: "importance", z: "centrality" } });
  assert.deepEqual(layout.nodes.find((item) => item.id === "missing")?.missing, ["time"]);
  assert.ok(edgeWidth(0.8) > edgeWidth(null));
});

test("正式个人入口优先于暂定工作画像作为空间锚点", () => {
  const layout = buildSpatialLayout([
    node("person.public", { type: "person", importance: 0.96, centrality: 1 }),
    node("person.hypothesis", { type: "person", importance: 1, centrality: 1 }),
  ], []);
  assert.equal(layout.anchorId, "person.public");
});
