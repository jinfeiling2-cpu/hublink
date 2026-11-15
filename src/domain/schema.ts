import { z } from "zod";
import { categories, nodeTypes, statuses } from "./registry";
import type { ContributionReviewStatus, ExitLink } from "./types";

const categoryIds = new Set(categories.map((item) => item.id));
const statusIds = new Set(statuses.map((item) => item.id));

export const nodeInputSchema = z.object({
  type: z.string().refine((id) => nodeTypes.some((item) => item.id === id), "未知的节点类型"),
  title: z.string().trim().min(1, "需要一个标题").max(120, "标题过长"),
  summary: z.string().trim().max(400, "简介请留在四百字以内"),
  body: z.string().trim().max(8000, "说明过长"),
  role: z.string().trim().max(80, "角色过长"),
  outcome: z.string().trim().max(200, "结果过长"),
  status: z.string().refine((id) => id === "" || statusIds.has(id), "未知的状态"),
  timeStart: z.string().trim().max(20).nullable(),
  timeEnd: z.string().trim().max(20).nullable(),
  scale: z.number().min(0, "规模从 0 到 1").max(1, "规模从 0 到 1"),
  importance: z.number().min(0, "重要性从 0 到 1").max(1, "重要性从 0 到 1"),
  centrality: z.number().min(0, "个人关联度从 0 到 1").max(1, "个人关联度从 0 到 1"),
  visibility: z.enum(["public", "personal"]),
  primaryUrl: z
    .string()
    .trim()
    .max(500)
    .refine((url) => url === "" || /^https?:\/\//.test(url), "链接需要以 http:// 或 https:// 开头"),
  exitLinks: z.array(
    z.object({
      label: z.string().trim().min(1).max(40),
      url: z.string().trim().url("深链需要是完整网址"),
    }),
  ),
  categoryIds: z.array(z.string()).refine((ids) => ids.every((id) => categoryIds.has(id)), "未知的类别"),
  contributionReview: z.enum(["system_verified", "owner_unconfirmed", "owner_confirmed"]).nullable(),
}).superRefine((value, context) => {
  if (value.type === "contribution" && !value.contributionReview) {
    context.addIssue({ code: "custom", path: ["contributionReview"], message: "个人贡献需要明确核对状态" });
  }
  if (value.type !== "contribution" && value.contributionReview) {
    context.addIssue({ code: "custom", path: ["contributionReview"], message: "核对状态只用于个人贡献节点" });
  }
  if (value.type === "contribution" && value.visibility === "public" && value.contributionReview !== "owner_confirmed") {
    context.addIssue({ code: "custom", path: ["visibility"], message: "未经本人确认的个人贡献不能公开" });
  }
});

export function parseExitLinks(text: string): ExitLink[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf("|");
      if (separator === -1) return { label: "链接", url: line };
      const label = line.slice(0, separator).trim() || "链接";
      const url = line.slice(separator + 1).trim();
      return { label, url };
    });
}

export function formatExitLinks(links: ExitLink[]) {
  return links.map((link) => `${link.label} | ${link.url}`).join("\n");
}

export function readNodeFields(formData: FormData) {
  const numberValue = (name: string) => {
    const raw = String(formData.get(name) ?? "").trim();
    if (raw === "") return 0;
    return Number(raw);
  };
  const text = (name: string) => String(formData.get(name) ?? "");
  const optionalTime = (name: string) => {
    const value = text(name).trim();
    return value === "" ? null : value;
  };

  return nodeInputSchema.safeParse({
    type: text("type"),
    title: text("title"),
    summary: text("summary"),
    body: text("body"),
    role: text("role"),
    outcome: text("outcome"),
    status: text("status"),
    timeStart: optionalTime("timeStart"),
    timeEnd: optionalTime("timeEnd"),
    scale: numberValue("scale"),
    importance: numberValue("importance"),
    centrality: numberValue("centrality"),
    visibility: text("visibility"),
    primaryUrl: text("primaryUrl"),
    exitLinks: parseExitLinks(text("exitLinks")),
    categoryIds: formData.getAll("categoryIds").map(String),
    contributionReview: text("contributionReview")
      ? text("contributionReview") as ContributionReviewStatus
      : text("type") === "contribution" ? "owner_unconfirmed" : null,
  });
}
