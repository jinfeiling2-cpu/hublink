import test from "node:test";
import assert from "node:assert/strict";
import { validateGithubReading } from "./github-reading";

const source = {
  repository: "owner/public",
  private: false,
  commit: "abc123",
  fetchedAt: "2026-11-03T00:00:00.000Z",
  branch: "main",
  readingMode: "architecture" as const,
  treeTruncated: false,
  files: [{ path: "README.md", contentHash: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", text: "hello" }],
};

const node = (id: string, privateSource = false) => ({
  id, type: "project", title: id, summary: "summary", body: "body", role: "", outcome: "", status: "exploring",
  timeStart: null, timeEnd: null, scale: 0.4, importance: 0.5, centrality: 0.5,
  visibility: privateSource ? "personal" as const : "public" as const, primaryUrl: "", exitLinks: [],
  categoryIds: [], sourceKind: "github", sourceExternalId: privateSource ? "owner/private" : "owner/public",
  sourcePrivate: privateSource, sourceSnapshot: { fetchedAt: source.fetchedAt, revision: privateSource ? "private" : source.commit },
});

test("公开仓库可以使用架构节点，私有仓库只能保留项目节点", () => {
  const privateSource = { ...source, repository: "owner/private", private: true, commit: "private", readingMode: "documents_only" as const, files: [] };
  assert.doesNotThrow(() => validateGithubReading({ nodes: [node("private", true)], edges: [] }, [privateSource], []));
  const graph = { nodes: [node("public"), node("private", true), { ...node("private-part", true), sourceExternalId: "owner/private#part", type: "part" }], edges: [] };
  assert.throws(() => validateGithubReading(graph, [source, privateSource], []), /cannot generate program structure/);
  const result = validateGithubReading({ nodes: [node("public")], edges: [] }, [source], []);
  assert.deepEqual(result, { nodes: 1, edges: 0, repositories: 1 });
});

test("私有项目拒绝程序结构边、目录树，以及损坏的来源内容", () => {
  const privateSource = { ...source, repository: "owner/private", private: true, commit: "private", readingMode: "documents_only" as const, files: [] };
  const graph = { nodes: [node("private", true)], edges: [{ id: "e", sourceId: "private", targetId: "existing", type: "contains", label: "structure", strength: 0.5, sortOrder: 1 }] };
  assert.throws(() => validateGithubReading(graph, [privateSource], ["existing"]), /program-structure edges/);
  assert.throws(() => validateGithubReading({ nodes: [], edges: [] }, [{ ...privateSource, tree: [] } as typeof privateSource], []), /documents only/);
  assert.throws(() => validateGithubReading({ nodes: [], edges: [] }, [{ ...source, files: [{ ...source.files[0], text: "modified" }] }], []), /Source content changed/);
});

test("关系必须有理由且来源版本必须匹配", () => {
  const project = node("public");
  assert.throws(() => validateGithubReading({ nodes: [project], edges: [{ id: "e", sourceId: "public", targetId: "public", type: "related_to", label: "", strength: 0.5, sortOrder: 1 }] }, [source], []), /rationale/);
  assert.throws(() => validateGithubReading({ nodes: [{ ...project, sourceSnapshot: { fetchedAt: source.fetchedAt, revision: "old" } }], edges: [] }, [source], []), /current commit/);
});
