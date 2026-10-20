import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { ensureHublinkSeed } from "@/db/ensure-hublink";
import type { EdgeRecord, ExitLink, NodeInput, NodeRecord, SourceSnapshot, Visibility } from "@/domain/types";

type NodeRow = {
  id: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  role: string;
  outcome: string;
  status: string;
  time_start: string | null;
  time_end: string | null;
  scale: number;
  importance: number;
  centrality: number;
  visibility: Visibility;
  primary_url: string;
  exit_links: string;
  source_kind: string;
  source_external_id: string;
  source_private: number;
  source_snapshot: string | null;
  created_at: string;
  updated_at: string;
};

type EdgeRow = {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  label: string;
  strength: number;
  sort_order: number;
};

const globalForDb = globalThis as unknown as { hublinkDb?: Database.Database };

function databasePath() {
  return path.join(process.cwd(), "data", "hublink.sqlite");
}

function getDb() {
  if (!globalForDb.hublinkDb) {
    fs.mkdirSync(path.dirname(databasePath()), { recursive: true });
    const db = new Database(databasePath());
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT '',
        outcome TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT '',
        time_start TEXT,
        time_end TEXT,
        scale REAL NOT NULL DEFAULT 0,
        importance REAL NOT NULL DEFAULT 0,
        centrality REAL NOT NULL DEFAULT 0,
        visibility TEXT NOT NULL DEFAULT 'personal',
        primary_url TEXT NOT NULL DEFAULT '',
        exit_links TEXT NOT NULL DEFAULT '[]',
        source_kind TEXT NOT NULL DEFAULT '',
        source_external_id TEXT NOT NULL DEFAULT '',
        source_private INTEGER NOT NULL DEFAULT 0,
        source_snapshot TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        strength REAL NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES nodes(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS node_categories (
        node_id TEXT NOT NULL,
        dimension_id TEXT NOT NULL,
        PRIMARY KEY (node_id, dimension_id),
        FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
      );
    `);
    ensureHublinkSeed(db);
    globalForDb.hublinkDb = db;
  }
  return globalForDb.hublinkDb;
}

function readJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function categoriesFor(db: Database.Database) {
  const rows = db.prepare("SELECT node_id, dimension_id FROM node_categories").all() as {
    node_id: string;
    dimension_id: string;
  }[];
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.node_id) ?? [];
    list.push(row.dimension_id);
    map.set(row.node_id, list);
  }
  return map;
}

function mapNode(row: NodeRow, categoryIds: string[]): NodeRecord {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary,
    body: row.body,
    role: row.role,
    outcome: row.outcome,
    status: row.status,
    timeStart: row.time_start,
    timeEnd: row.time_end,
    scale: row.scale,
    importance: row.importance,
    centrality: row.centrality,
    visibility: row.visibility,
    primaryUrl: row.primary_url,
    exitLinks: readJson<ExitLink[]>(row.exit_links, []),
    sourceKind: row.source_kind,
    sourceExternalId: row.source_external_id,
    sourcePrivate: row.source_private === 1,
    sourceSnapshot: readJson<SourceSnapshot | null>(row.source_snapshot, null),
    categoryIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listNodes(scope: "all" | "public" = "all"): NodeRecord[] {
  const db = getDb();
  const sql =
    scope === "public"
      ? "SELECT * FROM nodes WHERE visibility = 'public' ORDER BY created_at ASC"
      : "SELECT * FROM nodes ORDER BY created_at ASC";
  const rows = db.prepare(sql).all() as NodeRow[];
  const categories = categoriesFor(db);
  return rows.map((row) => mapNode(row, categories.get(row.id) ?? []));
}

export function getNode(id: string) {
  return listNodes().find((node) => node.id === id) ?? null;
}

export function findNodeBySource(sourceKind: string, externalId: string) {
  return listNodes().find((node) => node.sourceKind === sourceKind && node.sourceExternalId === externalId) ?? null;
}

export function listEdges(scope: "all" | "public" = "all"): EdgeRecord[] {
  const sql =
    scope === "public"
      ? `SELECT e.* FROM edges e
         JOIN nodes s ON s.id = e.source_id
         JOIN nodes t ON t.id = e.target_id
         WHERE s.visibility = 'public' AND t.visibility = 'public'
         ORDER BY e.sort_order ASC, e.id ASC`
      : "SELECT * FROM edges ORDER BY sort_order ASC, id ASC";
  const rows = getDb().prepare(sql).all() as EdgeRow[];
  return rows.map((row) => ({
    id: row.id,
    sourceId: row.source_id,
    targetId: row.target_id,
    type: row.type,
    label: row.label,
    strength: row.strength,
    sortOrder: row.sort_order,
  }));
}

function writeCategories(db: Database.Database, nodeId: string, categoryIds: string[]) {
  db.prepare("DELETE FROM node_categories WHERE node_id = ?").run(nodeId);
  const insert = db.prepare("INSERT INTO node_categories (node_id, dimension_id) VALUES (?, ?)");
  for (const categoryId of categoryIds) insert.run(nodeId, categoryId);
}

export function createNode(input: NodeInput) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO nodes (
        id, type, title, summary, body, role, outcome, status, time_start, time_end,
        scale, importance, centrality, visibility, primary_url, exit_links,
        source_kind, source_external_id, source_private, source_snapshot, created_at, updated_at
      ) VALUES (
        @id, @type, @title, @summary, @body, @role, @outcome, @status, @timeStart, @timeEnd,
        @scale, @importance, @centrality, @visibility, @primaryUrl, @exitLinks,
        @sourceKind, @sourceExternalId, @sourcePrivate, @sourceSnapshot, @createdAt, @updatedAt
      )`,
    ).run({
      id,
      ...input,
      exitLinks: JSON.stringify(input.exitLinks),
      sourcePrivate: input.sourcePrivate ? 1 : 0,
      sourceSnapshot: input.sourceSnapshot ? JSON.stringify(input.sourceSnapshot) : null,
      createdAt: now,
      updatedAt: now,
    });
    writeCategories(db, id, input.categoryIds);
  });
  insert();
  return id;
}

export function updateNode(id: string, input: NodeInput) {
  const db = getDb();
  const now = new Date().toISOString();
  const update = db.transaction(() => {
    db.prepare(
      `UPDATE nodes SET
        type = @type, title = @title, summary = @summary, body = @body, role = @role,
        outcome = @outcome, status = @status, time_start = @timeStart, time_end = @timeEnd,
        scale = @scale, importance = @importance, centrality = @centrality,
        visibility = @visibility, primary_url = @primaryUrl, exit_links = @exitLinks,
        source_kind = @sourceKind, source_external_id = @sourceExternalId,
        source_private = @sourcePrivate, source_snapshot = @sourceSnapshot, updated_at = @updatedAt
      WHERE id = @id`,
    ).run({
      id,
      ...input,
      exitLinks: JSON.stringify(input.exitLinks),
      sourcePrivate: input.sourcePrivate ? 1 : 0,
      sourceSnapshot: input.sourceSnapshot ? JSON.stringify(input.sourceSnapshot) : null,
      updatedAt: now,
    });
    writeCategories(db, id, input.categoryIds);
  });
  update();
}

export function setVisibility(id: string, visibility: Visibility) {
  getDb()
    .prepare("UPDATE nodes SET visibility = ?, updated_at = ? WHERE id = ?")
    .run(visibility, new Date().toISOString(), id);
}

export function deleteNode(id: string) {
  getDb().prepare("DELETE FROM nodes WHERE id = ?").run(id);
}

export function createEdge(input: Omit<EdgeRecord, "id">) {
  const id = crypto.randomUUID();
  getDb()
    .prepare(
      `INSERT INTO edges (id, source_id, target_id, type, label, strength, sort_order)
       VALUES (@id, @sourceId, @targetId, @type, @label, @strength, @sortOrder)`,
    )
    .run({ id, ...input });
  return id;
}

export function deleteEdge(id: string) {
  getDb().prepare("DELETE FROM edges WHERE id = ?").run(id);
}

export function counts() {
  const nodes = listNodes();
  return {
    publicNodes: nodes.filter((node) => node.visibility === "public").length,
    personalNodes: nodes.filter((node) => node.visibility === "personal").length,
    edges: listEdges().length,
  };
}
