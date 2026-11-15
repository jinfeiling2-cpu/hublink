import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { ensureHublinkSeed, ensurePersonalSeed } from "@/db/ensure-hublink";
import type { EdgeRecord, ExitLink, NodeInput, NodeRecord, SourceSnapshot, Visibility } from "@/domain/types";
import { resumeDraftContentSchema, type ResumeDraft, type ResumeDraftContent } from "@/domain/resume-draft";

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
  contribution_review: string | null;
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

export type ResumeProjectionRecord = {
  nodeId: string;
  position: number;
  selected: boolean;
  reviewedAt: string;
};

type ResumeDraftRow = { id: string; title: string; target_role: string; content_json: string; updated_at: string };

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
    ensureSchema(db);
    ensureHublinkSeed(db);
    ensurePersonalSeed(db);
    globalForDb.hublinkDb = db;
  }
  return globalForDb.hublinkDb;
}

export function ensureSchema(db: Database.Database) {
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
        contribution_review TEXT,
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
      CREATE TABLE IF NOT EXISTS resume_projection (
        node_id TEXT PRIMARY KEY,
        position INTEGER NOT NULL DEFAULT 0,
        selected INTEGER NOT NULL DEFAULT 0,
        reviewed_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS resume_drafts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        target_role TEXT NOT NULL,
        content_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        published_snapshot_json TEXT,
        published_at TEXT,
        publication_version TEXT
      );
    `);
  const columns = db.prepare("PRAGMA table_info(nodes)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "contribution_review")) {
    db.exec("ALTER TABLE nodes ADD COLUMN contribution_review TEXT");
  }
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
    contributionReview: row.contribution_review as NodeRecord["contributionReview"] ?? null,
    categoryIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listNodes(scope: "all" | "public" = "all", database = getDb()): NodeRecord[] {
  const db = database;
  const sql =
    scope === "public"
      ? "SELECT * FROM nodes WHERE visibility = 'public' ORDER BY created_at ASC"
      : "SELECT * FROM nodes ORDER BY created_at ASC";
  const rows = db.prepare(sql).all() as NodeRow[];
  const categories = categoriesFor(db);
  return rows.map((row) => mapNode(row, categories.get(row.id) ?? []));
}

export function getNode(id: string, database = getDb()) {
  return listNodes("all", database).find((node) => node.id === id) ?? null;
}

export function findNodeBySource(sourceKind: string, externalId: string) {
  return listNodes().find((node) => node.sourceKind === sourceKind && node.sourceExternalId === externalId) ?? null;
}

export function listEdges(scope: "all" | "public" = "all", database = getDb()): EdgeRecord[] {
  const sql =
    scope === "public"
      ? `SELECT e.* FROM edges e
         JOIN nodes s ON s.id = e.source_id
         JOIN nodes t ON t.id = e.target_id
         WHERE s.visibility = 'public' AND t.visibility = 'public'
         ORDER BY e.sort_order ASC, e.id ASC`
      : "SELECT * FROM edges ORDER BY sort_order ASC, id ASC";
  const rows = database.prepare(sql).all() as EdgeRow[];
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

export function createNode(input: NodeInput, db = getDb()) {
  if (input.type === "contribution") throw new Error("Create contribution nodes with an explicit project relationship.");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO nodes (
        id, type, title, summary, body, role, outcome, status, time_start, time_end,
        scale, importance, centrality, visibility, primary_url, exit_links,
        source_kind, source_external_id, source_private, source_snapshot, contribution_review, created_at, updated_at
      ) VALUES (
        @id, @type, @title, @summary, @body, @role, @outcome, @status, @timeStart, @timeEnd,
        @scale, @importance, @centrality, @visibility, @primaryUrl, @exitLinks,
        @sourceKind, @sourceExternalId, @sourcePrivate, @sourceSnapshot, @contributionReview, @createdAt, @updatedAt
      )`,
    ).run({
      id,
      ...input,
      exitLinks: JSON.stringify(input.exitLinks),
      sourcePrivate: input.sourcePrivate ? 1 : 0,
      sourceSnapshot: input.sourceSnapshot ? JSON.stringify(input.sourceSnapshot) : null,
      contributionReview: input.contributionReview ?? null,
      createdAt: now,
      updatedAt: now,
    });
    writeCategories(db, id, input.categoryIds);
  });
  insert();
  return id;
}

export function createContributionNode(input: NodeInput, projectId: string, db = getDb(), fixedId?: string) {
  if (input.type !== "contribution") throw new Error("Expected a contribution node.");
  const parent = getNode(projectId, db);
  if (!parent || !["project", "experience"].includes(parent.type)) throw new Error("Contribution parent must be a project or experience.");
  const id = fixedId ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const visibility = input.contributionReview === "owner_confirmed" ? input.visibility : "personal";
  const insert = db.transaction(() => {
    db.prepare(`
      INSERT INTO nodes (
        id, type, title, summary, body, role, outcome, status, time_start, time_end,
        scale, importance, centrality, visibility, primary_url, exit_links,
        source_kind, source_external_id, source_private, source_snapshot, contribution_review, created_at, updated_at
      ) VALUES (
        @id, @type, @title, @summary, @body, @role, @outcome, @status, @timeStart, @timeEnd,
        @scale, @importance, @centrality, @visibility, @primaryUrl, @exitLinks,
        @sourceKind, @sourceExternalId, @sourcePrivate, @sourceSnapshot, @contributionReview, @createdAt, @updatedAt
      )
    `).run({
      id, ...input, visibility,
      exitLinks: JSON.stringify(input.exitLinks),
      sourcePrivate: input.sourcePrivate ? 1 : 0,
      sourceSnapshot: input.sourceSnapshot ? JSON.stringify(input.sourceSnapshot) : null,
      contributionReview: input.contributionReview ?? "owner_unconfirmed",
      createdAt: now, updatedAt: now,
    });
    writeCategories(db, id, input.categoryIds);
    const nextOrder = (db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM edges WHERE type = 'contribution_to' AND target_id = ?").get(projectId) as { n: number }).n;
    db.prepare(`INSERT INTO edges (id, source_id, target_id, type, label, strength, sort_order)
      VALUES (?, ?, ?, 'contribution_to', '', 0, ?)`)
      .run(crypto.randomUUID(), id, projectId, nextOrder);
  });
  insert();
  return id;
}

export function setContributionParent(contributionId: string, projectId: string, db = getDb()) {
  const contribution = getNode(contributionId, db);
  const parent = getNode(projectId, db);
  if (!contribution || contribution.type !== "contribution" || !parent || !["project", "experience"].includes(parent.type)) {
    throw new Error("Invalid contribution or parent.");
  }
  const write = db.transaction(() => {
    db.prepare("DELETE FROM edges WHERE type = 'contribution_to' AND source_id = ?").run(contributionId);
    const nextOrder = (db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM edges WHERE type = 'contribution_to' AND target_id = ?").get(projectId) as { n: number }).n;
    db.prepare(`INSERT INTO edges (id, source_id, target_id, type, label, strength, sort_order)
      VALUES (?, ?, ?, 'contribution_to', '', 0, ?)`)
      .run(crypto.randomUUID(), contributionId, projectId, nextOrder);
  });
  write();
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
        source_private = @sourcePrivate, source_snapshot = @sourceSnapshot,
        contribution_review = @contributionReview, updated_at = @updatedAt
      WHERE id = @id`,
    ).run({
      id,
      ...input,
      exitLinks: JSON.stringify(input.exitLinks),
      sourcePrivate: input.sourcePrivate ? 1 : 0,
      sourceSnapshot: input.sourceSnapshot ? JSON.stringify(input.sourceSnapshot) : null,
      contributionReview: input.contributionReview ?? null,
      updatedAt: now,
    });
    writeCategories(db, id, input.categoryIds);
    if (input.visibility !== "public" || input.sourcePrivate) {
      db.prepare("UPDATE resume_projection SET selected = 0, reviewed_at = ? WHERE node_id = ?")
        .run(now, id);
    }
  });
  update();
}

export function setVisibility(id: string, visibility: Visibility, db = getDb()) {
  const node = getNode(id, db);
  if (node?.type === "contribution" && visibility === "public" && node.contributionReview !== "owner_confirmed") {
    throw new Error("A contribution must be owner-confirmed before it can be public.");
  }
  const update = db.transaction(() => {
    db.prepare("UPDATE nodes SET visibility = ?, updated_at = ? WHERE id = ?")
      .run(visibility, new Date().toISOString(), id);
    if (visibility === "personal") {
      db.prepare("UPDATE resume_projection SET selected = 0, reviewed_at = ? WHERE node_id = ?")
        .run(new Date().toISOString(), id);
    }
  });
  update();
}

export function deleteNode(id: string) {
  const db = getDb();
  const remove = db.transaction(() => {
    db.prepare("DELETE FROM resume_projection WHERE node_id = ?").run(id);
    db.prepare("DELETE FROM nodes WHERE id = ?").run(id);
  });
  remove();
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

export function listResumeProjection(): ResumeProjectionRecord[] {
  const rows = getDb()
    .prepare("SELECT node_id, position, selected, reviewed_at FROM resume_projection ORDER BY position ASC, node_id ASC")
    .all() as { node_id: string; position: number; selected: number; reviewed_at: string }[];
  return rows.map((row) => ({
    nodeId: row.node_id,
    position: row.position,
    selected: row.selected === 1,
    reviewedAt: row.reviewed_at,
  }));
}

export function setResumeProjectionNode(nodeId: string, selected: boolean, position?: number) {
  const node = getNode(nodeId);
  if (!node || node.type !== "project" || node.visibility !== "public" || node.sourcePrivate) {
    throw new Error("Only public projects with public sources can enter the resume projection.");
  }
  const db = getDb();
  const nextPosition = position ?? (db.prepare(
    "SELECT COALESCE(MAX(position), 0) + 1 AS next FROM resume_projection WHERE selected = 1",
  ).get() as { next: number }).next;
  db.prepare(`
    INSERT INTO resume_projection (node_id, position, selected, reviewed_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(node_id) DO UPDATE SET position = excluded.position, selected = excluded.selected, reviewed_at = excluded.reviewed_at
  `).run(nodeId, nextPosition, selected ? 1 : 0, new Date().toISOString());
}

export function listResumeDrafts(db = getDb()): ResumeDraft[] {
  const rows = db.prepare("SELECT id, title, target_role, content_json, updated_at FROM resume_drafts ORDER BY updated_at DESC, id ASC").all() as ResumeDraftRow[];
  return rows.map(mapResumeDraft);
}

export function getResumeDraft(id: string, db = getDb()): ResumeDraft | null {
  const row = db.prepare("SELECT id, title, target_role, content_json, updated_at FROM resume_drafts WHERE id = ?").get(id) as ResumeDraftRow | undefined;
  return row ? mapResumeDraft(row) : null;
}

function mapResumeDraft(row: ResumeDraftRow): ResumeDraft {
  return {
    id: row.id,
    title: row.title,
    targetRole: row.target_role,
    content: resumeDraftContentSchema.parse(JSON.parse(row.content_json)),
    updatedAt: row.updated_at,
  };
}

export function createResumeDraft(input: { title: string; targetRole: string; content: ResumeDraftContent }, db = getDb()) {
  const content = resumeDraftContentSchema.parse(input.content);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO resume_drafts (id, title, target_role, content_json, updated_at)
    VALUES (?, ?, ?, ?, ?)`)
    .run(id, input.title, input.targetRole, JSON.stringify(content), now);
  return id;
}

export function saveResumeDraft(input: { id: string; title: string; targetRole: string; content: ResumeDraftContent }, db = getDb()) {
  const content = resumeDraftContentSchema.parse(input.content);
  const now = new Date().toISOString();
  const result = db.prepare(`UPDATE resume_drafts SET title = ?, target_role = ?, content_json = ?, updated_at = ? WHERE id = ?`)
    .run(input.title, input.targetRole, JSON.stringify(content), now, input.id);
  if (result.changes !== 1) throw new Error("Resume draft was not found.");
}

export function counts() {
  const nodes = listNodes();
  return {
    publicNodes: nodes.filter((node) => node.visibility === "public").length,
    personalNodes: nodes.filter((node) => node.visibility === "personal").length,
    edges: listEdges().length,
  };
}
