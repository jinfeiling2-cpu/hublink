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

test("内部图指向代码文件和函数，而不是概念清单", () => {
  assert.equal(hublinkNodes.find((node) => node.id === "hublink")?.visibility, "public");
  const titles = hublinkNodes.map((node) => node.title);
  assert.equal(titles.includes("四种看法"), false);
  assert.equal(titles.includes("留白"), false);
  for (const node of hublinkNodes) {
    assert.ok(node.summary.length > 12, node.id);
    if (node.id === "hublink") continue;
    assert.match(node.summary + node.body, /src\/|[A-Za-z]{3,}\(/, node.id);
  }
  const ids = new Set(hublinkNodes.map((node) => node.id));
  for (const edge of hublinkEdges) {
    assert.ok(ids.has(edge.sourceId) && ids.has(edge.targetId), edge.id);
  }
  const layers = hublinkEdges.filter((edge) => edge.sourceId === "hublink" && edge.type === "contains").map((edge) => edge.targetId);
  assert.deepEqual(layers, [
    "hublink.readme",
    "hublink.app",
    "hublink.domain",
    "hublink.db",
    "hublink.lib",
    "hublink.read",
    "hublink.write",
    "hublink.canvas",
    "hublink.pull",
  ]);
  assert.equal(hublinkNodes.some((item) => item.title === "README"), true);
  assert.equal(hublinkEdges.some((item) => item.type === "step" && item.sourceId === "hublink.read"), true);
});
