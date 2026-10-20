"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { edgeTypes } from "@/domain/registry";
import { mergeSourcePull } from "@/domain/graph";
import { readNodeFields } from "@/domain/schema";
import {
  createEdge,
  createNode,
  deleteEdge,
  deleteNode,
  findNodeBySource,
  getNode,
  setVisibility,
  updateNode,
} from "@/db/store";
import { GithubPullError, pullGithubRepo } from "@/lib/github";
import { clearAdminCookie, isAdmin, passwordMatches, setAdminCookie } from "@/lib/session";
import type { Visibility } from "@/domain/types";

export type FormState = { error: string };

async function assertAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function login(_state: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) return { error: "口令不对。" };
  await setAdminCookie();
  redirect("/admin");
}

export async function logout() {
  await clearAdminCookie();
  redirect("/");
}

export async function saveNode(_state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const parsed = readNodeFields(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "这份节点还不完整。" };
  }
  const id = String(formData.get("id") ?? "");
  if (id) {
    const existing = getNode(id);
    if (!existing) return { error: "节点已经不在了。" };
    updateNode(id, {
      ...parsed.data,
      sourceKind: existing.sourceKind,
      sourceExternalId: existing.sourceExternalId,
      sourcePrivate: existing.sourcePrivate,
      sourceSnapshot: existing.sourceSnapshot,
    });
    refresh();
    redirect(`/admin/nodes/${id}?notice=saved`);
  }
  const created = createNode({
    ...parsed.data,
    sourceKind: "",
    sourceExternalId: "",
    sourcePrivate: false,
    sourceSnapshot: null,
  });
  refresh();
  redirect(`/admin/nodes/${created}?notice=saved`);
}

export async function removeNode(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) deleteNode(id);
  refresh();
  redirect("/admin?notice=deleted");
}

export async function changeVisibility(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const visibility = String(formData.get("visibility") ?? "");
  if (!id || (visibility !== "public" && visibility !== "personal")) return;
  setVisibility(id, visibility as Visibility);
  refresh();
  redirect("/admin?notice=visibility");
}

export async function saveEdge(_state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const sourceId = String(formData.get("sourceId") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const type = String(formData.get("type") ?? "");
  const strength = Number(formData.get("strength") ?? 0);
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  if (!getNode(sourceId) || !getNode(targetId)) return { error: "连线的两端都需要是已有节点。" };
  if (sourceId === targetId) return { error: "一条连线需要两个不同的节点。" };
  if (!edgeTypes.some((item) => item.id === type)) return { error: "未知的连接类型。" };
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) return { error: "强度从 0 到 1。" };
  if (!Number.isInteger(sortOrder)) return { error: "序号需要是整数。" };
  createEdge({
    sourceId,
    targetId,
    type,
    label: "",
    strength,
    sortOrder,
  });
  refresh();
  redirect("/admin?notice=edge");
}

export async function removeEdge(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) deleteEdge(id);
  refresh();
  redirect("/admin?notice=edge-deleted");
}

export async function pullRepository(_state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const input = String(formData.get("repo") ?? "");
  let id = "";
  let created = false;
  try {
    const pull = await pullGithubRepo(input, process.env.GITHUB_TOKEN);
    const existing = findNodeBySource("github", pull.externalId);
    const merged = mergeSourcePull(existing, pull);
    if (existing) {
      updateNode(existing.id, merged);
      id = existing.id;
    } else {
      id = createNode(merged);
      created = true;
    }
  } catch (error) {
    if (error instanceof GithubPullError) return { error: error.message };
    throw error;
  }
  refresh();
  redirect(`/admin/nodes/${id}?notice=${created ? "pulled" : "refreshed"}`);
}

export async function saveXiaohongshu(_state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const primaryUrl = String(formData.get("primaryUrl") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "personal");
  if (!title) return { error: "需要一个账号名称。" };
  if (!/^https?:\/\//.test(primaryUrl)) return { error: "主页需要是完整网址。" };
  if (visibility !== "public" && visibility !== "personal") return { error: "请选择公开或个人。" };
  const id = createNode({
    type: "social_account",
    title,
    summary,
    body: "",
    role: "",
    outcome: "",
    status: "",
    timeStart: null,
    timeEnd: null,
    scale: 0,
    importance: 0,
    centrality: 0,
    visibility,
    primaryUrl,
    exitLinks: [],
    categoryIds: [],
    sourceKind: "xiaohongshu",
    sourceExternalId: primaryUrl,
    sourcePrivate: false,
    sourceSnapshot: null,
  });
  refresh();
  redirect(`/admin/nodes/${id}?notice=saved`);
}
