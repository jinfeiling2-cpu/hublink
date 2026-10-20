import type Database from "better-sqlite3";
import { hublinkEdges, hublinkNodes } from "@/content/hublink";

const createdAt = "2026-10-20T00:00:00.000Z";

export function ensureHublinkSeed(db: Database.Database) {
  const hasNode = db.prepare("SELECT 1 AS ok FROM nodes WHERE id = ?");
  const hasEdge = db.prepare("SELECT 1 AS ok FROM edges WHERE id = ?");
  const insertNode = db.prepare(
    `INSERT INTO nodes (
      id, type, title, summary, body, role, outcome, status, time_start, time_end,
      scale, importance, centrality, visibility, primary_url, exit_links,
      source_kind, source_external_id, source_private, source_snapshot, created_at, updated_at
    ) VALUES (
      @id, @type, @title, @summary, @body, @role, @outcome, @status, @timeStart, @timeEnd,
      @scale, @importance, @centrality, @visibility, '', '[]',
      '', '', 0, NULL, @createdAt, @createdAt
    )`,
  );
  const insertCategory = db.prepare("INSERT INTO node_categories (node_id, dimension_id) VALUES (?, ?)");
  const insertEdge = db.prepare(
    `INSERT INTO edges (id, source_id, target_id, type, label, strength, sort_order)
     VALUES (@id, @sourceId, @targetId, @type, '', 0, @sortOrder)`,
  );

  const write = db.transaction(() => {
    for (const item of hublinkNodes) {
      if (hasNode.get(item.id)) continue;
      insertNode.run({ ...item, createdAt });
      for (const categoryId of item.categoryIds) insertCategory.run(item.id, categoryId);
    }
    for (const item of hublinkEdges) {
      if (hasEdge.get(item.id)) continue;
      insertEdge.run(item);
    }
  });
  write();
}
