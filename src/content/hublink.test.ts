import assert from "node:assert/strict";
import test from "node:test";
import { hublinkEdges, hublinkNodes } from "./hublink";
import { traverseTree, type TraverseHit } from "@/domain/graph";
import { viewById, type TraverseConfig } from "@/domain/registry";
import type { EdgeRecord } from "@/domain/types";

function asEdges(): EdgeRecord[] {
  return hublinkEdges.map((edge) => ({ ...edge, label: "", strength: 0 }));
}

function collect(hit: TraverseHit, ids = new Set<string>()): Set<string> {
  ids.add(hit.id);
  for (const child of hit.children) collect(child, ids);
  return ids;
}

test("第一个项目的内部图能在项目深入里走完", () => {
  const view = viewById("project-depth");
  assert.equal(view?.kind, "traverse");
  const config = view?.config as TraverseConfig;
  const tree = traverseTree("hublink", asEdges(), config.edgeTypes, config.maxDepth);
  const seen = collect(tree);
  const missing = hublinkNodes.map((node) => node.id).filter((id) => !seen.has(id));
  assert.deepEqual(missing, []);
});

test("讲解点都有一句能单独读的简介，留白不假装已经完成", () => {
  assert.equal(hublinkNodes.find((node) => node.id === "hublink")?.visibility, "public");
  for (const node of hublinkNodes) {
    assert.ok(node.summary.length > 12, node.id);
  }
  const roomChildren = hublinkEdges.filter((edge) => edge.sourceId === "hublink.room").map((edge) => edge.targetId);
  assert.deepEqual(roomChildren, ["hublink.room.open"]);
  const ids = new Set(hublinkNodes.map((node) => node.id));
  for (const edge of hublinkEdges) {
    assert.ok(ids.has(edge.sourceId) && ids.has(edge.targetId), edge.id);
  }
});
