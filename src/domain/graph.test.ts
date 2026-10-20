import assert from "node:assert/strict";
import test from "node:test";
import { parseGithubRepo } from "./github-ref";
import {
  impressionSelection,
  mergeSourcePull,
  rankNodes,
  traverseTree,
  visibilityForSource,
  visibleGraph,
} from "./graph";
import type { EdgeRecord, NodeRecord, SourcePull } from "./types";

function node(partial: Partial<NodeRecord> & Pick<NodeRecord, "id" | "type" | "title">): NodeRecord {
  return {
    summary: "",
    body: "",
    role: "",
    outcome: "",
    status: "",
    timeStart: null,
    timeEnd: null,
    scale: 0,
    importance: 0,
    centrality: 0,
    visibility: "public",
    primaryUrl: "",
    exitLinks: [],
    sourceKind: "",
    sourceExternalId: "",
    sourcePrivate: false,
    sourceSnapshot: null,
    categoryIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function edge(partial: Partial<EdgeRecord> & Pick<EdgeRecord, "id" | "sourceId" | "targetId" | "type">): EdgeRecord {
  return { label: "", strength: 0, sortOrder: 0, ...partial };
}

test("公开图丢掉个人节点，以及任何一端不可见的连线", () => {
  const nodes = [
    node({ id: "p", type: "project", title: "公开项目" }),
    node({ id: "h", type: "project", title: "个人项目", visibility: "personal", importance: 1 }),
    node({ id: "d", type: "direction", title: "方向" }),
  ];
  const edges = [
    edge({ id: "e1", sourceId: "p", targetId: "d", type: "embodies" }),
    edge({ id: "e2", sourceId: "h", targetId: "d", type: "embodies" }),
  ];
  const graph = visibleGraph(nodes, edges, "public");
  assert.deepEqual(graph.nodes.map((item) => item.id).sort(), ["d", "p"]);
  assert.deepEqual(graph.edges.map((item) => item.id), ["e1"]);
});

test("私有来源默认个人，公开来源默认公开", () => {
  assert.equal(visibilityForSource(true), "personal");
  assert.equal(visibilityForSource(false), "public");
});

test("排序把没有时间的节点放在最后", () => {
  const nodes = [
    node({ id: "a", type: "project", title: "较早", timeStart: "2020-01" }),
    node({ id: "b", type: "project", title: "较晚", timeStart: "2024-05" }),
    node({ id: "c", type: "project", title: "未注时间" }),
  ];
  const ranked = rankNodes(nodes, [], "time", "desc").map((item) => item.id);
  assert.deepEqual(ranked, ["b", "a", "c"]);
});

test("十几秒印象只从当前图里按亲疏和重要性取节点", () => {
  const nodes = [
    node({ id: "me", type: "person", title: "某人", summary: "做系统的人", centrality: 1 }),
    node({ id: "d1", type: "direction", title: "阅读", centrality: 0.9 }),
    node({ id: "d2", type: "direction", title: "工具", centrality: 0.2 }),
    node({ id: "keep", type: "project", title: "代表作", importance: 0.8 }),
    node({ id: "hide", type: "project", title: "草稿", importance: 1, visibility: "personal" }),
  ];
  const graph = visibleGraph(nodes, [], "public");
  const impression = impressionSelection(graph.nodes, []);
  assert.equal(impression.person?.id, "me");
  assert.equal(impression.directions[0]?.id, "d1");
  assert.deepEqual(impression.projects.map((item) => item.id), ["keep"]);
});

test("深入只沿指定连接向前走，不走回去", () => {
  const edges = [
    edge({ id: "c", sourceId: "project", targetId: "part", type: "contains", sortOrder: 1 }),
    edge({ id: "d", sourceId: "part", targetId: "other", type: "depends_on" }),
    edge({ id: "back", sourceId: "part", targetId: "project", type: "depends_on" }),
    edge({ id: "doc", sourceId: "project", targetId: "note", type: "documents" }),
  ];
  const tree = traverseTree("project", edges, ["contains", "depends_on"], 3);
  assert.equal(tree.children[0]?.id, "part");
  assert.deepEqual(tree.children[0]?.children.map((item) => item.id), ["other"]);
  assert.equal(JSON.stringify(tree).includes("note"), false);
});

test("拉取新建时写入简介和可见性，说明层留空；再次拉取不覆盖正文", () => {
  const pull: SourcePull = {
    sourceKind: "github",
    externalId: "octo/repo",
    sourcePrivate: false,
    suggestedTitle: "repo",
    suggestedSummary: "仓库简介",
    primaryUrl: "https://github.com/octo/repo",
    snapshot: {
      fetchedAt: "2026-10-20T00:00:00.000Z",
      readmeExcerpt: "这是 README，不应成为说明。",
      description: "仓库简介",
    },
  };
  const created = mergeSourcePull(null, pull);
  assert.equal(created.summary, "仓库简介");
  assert.equal(created.body, "");
  assert.equal(created.visibility, "public");
  assert.equal(created.sourceSnapshot?.readmeExcerpt?.includes("README"), true);

  const existing = node({
    id: "n",
    type: "project",
    title: "我的名字",
    summary: "我写的简介",
    body: "内部如何运行",
    visibility: "personal",
    primaryUrl: "https://example.com",
  });
  const refreshed = mergeSourcePull(existing, { ...pull, sourcePrivate: true, suggestedSummary: "新简介" });
  assert.equal(refreshed.title, "我的名字");
  assert.equal(refreshed.summary, "我写的简介");
  assert.equal(refreshed.body, "内部如何运行");
  assert.equal(refreshed.visibility, "personal");
  assert.equal(refreshed.sourcePrivate, true);
  assert.equal(refreshed.primaryUrl, "https://example.com");
});

test("解析 GitHub 仓库地址", () => {
  assert.deepEqual(parseGithubRepo("octo/repo"), { owner: "octo", repo: "repo" });
  assert.deepEqual(parseGithubRepo("https://github.com/octo/repo.git"), { owner: "octo", repo: "repo" });
  assert.equal(parseGithubRepo("不是仓库"), null);
});
