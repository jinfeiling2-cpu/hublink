import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { validateGithubReading, type GithubReadingGraph, type GithubReadingSource } from "../src/domain/github-reading";

const root = path.join(process.cwd(), "data");
const draft = JSON.parse(fs.readFileSync(path.join(root, "github-reading-draft.json"), "utf8")) as GithubReadingGraph;
const sources: GithubReadingSource[] = fs.readdirSync(path.join(root, "github-sources"))
  .filter((file) => file.endsWith(".json") && file !== "index.json")
  .map((file) => JSON.parse(fs.readFileSync(path.join(root, "github-sources", file), "utf8")));
const graph: GithubReadingGraph = {
  nodes: draft.nodes.map((node) => {
    const source = sources.find((item) => item.repository === node.sourceExternalId.split("#")[0]);
    return {
      ...node, primaryUrl: node.primaryUrl ?? "", exitLinks: [],
      categoryIds: node.categoryIds.length ? node.categoryIds : ["activity.making", "artifact.system"],
      body: node.body + (node.sourceKind === "github" ? "\n\n阅读说明：基于固定仓库版本的分析整理；项目定位与关系权重可由本人修订，不能据此推定独立作者贡献、实际效果或最新进度。" : ""),
      sourceSnapshot: node.sourceSnapshot && source ? {
        ...node.sourceSnapshot, fetchedAt: source.fetchedAt, branch: source.branch,
      } : null,
    };
  }),
  edges: draft.edges,
};
async function main() {
  const databaseFile = path.join(root, "hublink.sqlite");
  if (!fs.existsSync(databaseFile)) throw new Error("Start Hublink once to initialize its database before importing GitHub readings.");
  const reader = new Database(databaseFile, { readonly: true, fileMustExist: true });
  let result: ReturnType<typeof validateGithubReading>;
  try {
    const existing = reader.prepare("SELECT id FROM nodes").all() as { id: string }[];
    result = validateGithubReading(graph, sources, existing.map((node) => node.id));
  } finally {
    reader.close();
  }
  const db = new Database(databaseFile, { fileMustExist: true });
  db.pragma("foreign_keys = ON");
  const now = new Date().toISOString();
  const directory = path.join(root, "backups", "github-reading-" + now.replace(/[:.]/g, "-"));
  fs.mkdirSync(directory, { recursive: true });
  await db.backup(path.join(directory, "hublink.sqlite"));
  const graphFile = path.join(root, "github-reading-graph.json");
  if (fs.existsSync(graphFile)) fs.copyFileSync(graphFile, path.join(directory, "github-reading-graph.json"));

  let insertedNodes = 0;
  let insertedEdges = 0;
  const insertNode = db.prepare(`INSERT INTO nodes (
    id,type,title,summary,body,role,outcome,status,time_start,time_end,scale,importance,centrality,
    visibility,primary_url,exit_links,source_kind,source_external_id,source_private,source_snapshot,created_at,updated_at
  ) VALUES (@id,@type,@title,@summary,@body,@role,@outcome,@status,@timeStart,@timeEnd,@scale,@importance,@centrality,
    @visibility,@primaryUrl,@exitLinks,@sourceKind,@sourceExternalId,@sourcePrivate,@sourceSnapshot,@createdAt,@createdAt)
    ON CONFLICT(id) DO NOTHING`);
  const insertEdge = db.prepare(`INSERT INTO edges(id,source_id,target_id,type,label,strength,sort_order)
    VALUES (@id,@sourceId,@targetId,@type,@label,@strength,@sortOrder) ON CONFLICT(id) DO NOTHING`);
  const refreshGenerated = process.argv.includes("--refresh-generated");
  const refreshNode = db.prepare(`UPDATE nodes SET
    type=@type,title=@title,summary=@summary,body=@body,role=@role,outcome=@outcome,status=@status,
    time_start=@timeStart,time_end=@timeEnd,scale=@scale,importance=@importance,centrality=@centrality,
    source_snapshot=@sourceSnapshot,updated_at=@updatedAt
    WHERE id=@id AND source_kind='github'`);
  db.transaction(() => {
    for (const node of graph.nodes) {
      const record = {
        ...node, exitLinks: JSON.stringify(node.exitLinks), sourcePrivate: node.sourcePrivate ? 1 : 0,
        sourceSnapshot: node.sourceSnapshot ? JSON.stringify(node.sourceSnapshot) : null, createdAt: now, updatedAt: now,
      };
      const changes = insertNode.run(record).changes;
      insertedNodes += changes;
      if (refreshGenerated && node.id !== "hublink" && node.sourceKind === "github") refreshNode.run(record);
      if (changes) {
        for (const category of node.categoryIds) db.prepare("INSERT INTO node_categories(node_id,dimension_id) VALUES (?,?)").run(node.id, category);
      }
      // Only fill an empty source identity; preserve existing prose, visibility and subsequent admin edits.
      db.prepare(`UPDATE nodes SET source_kind = ?, source_external_id = ?, source_private = ?, source_snapshot = ?,
        primary_url = CASE WHEN primary_url = '' THEN ? ELSE primary_url END
        WHERE id = ? AND source_kind = ''`).run(node.sourceKind, node.sourceExternalId, node.sourcePrivate ? 1 : 0,
        node.sourceSnapshot ? JSON.stringify(node.sourceSnapshot) : null, node.primaryUrl, node.id);
    }
    for (const edge of graph.edges) insertedEdges += insertEdge.run(edge).changes;
  })();
  const temporary = graphFile + ".tmp";
  fs.writeFileSync(temporary, JSON.stringify(graph, null, 2) + "\n");
  fs.renameSync(temporary, graphFile);
  db.close();
  console.log(JSON.stringify({ ...result, insertedNodes, insertedEdges, backup: directory }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
