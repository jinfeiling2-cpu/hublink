import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicContext } from "./public-context";
import type { EdgeRecord, NodeRecord } from "./types";

const node = (id: string, visibility: "public" | "personal"): NodeRecord => ({
  id, visibility, type: "project", title: id, summary: "公开摘要", body: "公开正文", role: "", outcome: "", status: "",
  timeStart: null, timeEnd: null, scale: 0, importance: 0, centrality: 0,
  primaryUrl: "", exitLinks: [], categoryIds: [], sourceKind: "", sourceExternalId: "PRIVATE_EXTERNAL_ID",
  sourcePrivate: true, sourceSnapshot: { fetchedAt: "", readmeExcerpt: "PRIVATE_SOURCE_MARKER" },
  createdAt: "", updatedAt: "",
});
const edge = (id: string, sourceId: string, targetId: string): EdgeRecord => ({
  id, sourceId, targetId, type: "related_to", label: "", strength: 0.5, sortOrder: 0,
});

test("公开 context 隔离私人节点、关联边与来源快照，保留正文和可引用页面", () => {
  const context = buildPublicContext([node("a", "public"), node("b", "public"), node("SECRET_NODE", "personal")],
    [edge("ab", "a", "b"), edge("SECRET_EDGE", "a", "SECRET_NODE")], "https://example.test");
  assert.deepEqual(context.nodes.map((item) => item.id), ["a", "b"]);
  assert.deepEqual(context.edges.map((item) => item.id), ["ab"]);
  assert.equal(context.nodes[0].body, "公开正文");
  assert.equal(context.nodes[0].status, null);
  assert.equal(context.nodes[0].url, "https://example.test/node/a");
  assert.equal(/SECRET_|PRIVATE_/.test(JSON.stringify(context)), false);
});

test("context 指纹不随时间、访问域名或输入排序变化，公开内容修改后改变", () => {
  const nodes = [node("a", "public"), node("b", "public")];
  const first = buildPublicContext(nodes, [], "https://example.test");
  const second = buildPublicContext([...nodes].reverse(), [], "http://localhost:43123");
  assert.equal(first.publicationVersion, second.publicationVersion);
  nodes[0].body = "修改后的正文";
  assert.notEqual(buildPublicContext(nodes, [], "https://example.test").publicationVersion, first.publicationVersion);
});
