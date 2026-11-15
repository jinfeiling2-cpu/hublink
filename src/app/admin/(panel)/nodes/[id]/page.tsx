import { notFound } from "next/navigation";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NodeForm } from "@/components/node-form";
import { Button } from "@/components/ui/button";
import { getNode, listEdges, listNodes } from "@/db/store";
import { isAdmin } from "@/lib/session";
import { removeNode, saveNode } from "../../../actions";

export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  saved: "已保存。",
  "review-required": "贡献需先标记为本人已确认，才可以设为公开。",
  pulled: "已从 GitHub 建立节点。简介来自仓库简介，说明层留空。可见性跟随仓库是否公开。",
  refreshed: "已更新 GitHub 快照。简介、说明和可见性保持原样。",
};

export default async function EditNodePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!(await isAdmin())) redirect("/admin/login");
  const query = await searchParams;
  const node = getNode(id);
  if (!node) notFound();
  const noticeKey = typeof query.notice === "string" ? query.notice : "";
  const snapshot = node.sourceSnapshot;
  const allNodes = listNodes();
  const allEdges = listEdges();
  const contributionParentId = node.type === "contribution"
    ? allEdges.find((edge) => edge.type === "contribution_to" && edge.sourceId === node.id)?.targetId
    : undefined;
  const contributions = ["project", "experience"].includes(node.type)
    ? allEdges.filter((edge) => edge.type === "contribution_to" && edge.targetId === node.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((edge) => allNodes.find((item) => item.id === edge.sourceId))
      .filter((item) => item?.type === "contribution")
    : [];

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">编辑节点</h1>
        {notices[noticeKey] ? <p className="text-sm text-primary">{notices[noticeKey]}</p> : null}
        {node.visibility === "public" ? (
          <a href={`/node/${node.id}`} className="text-sm text-muted-foreground underline underline-offset-4">
            查看公开页
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">当前是个人节点，公开页打不开它。</p>
        )}
      </header>
      <NodeForm action={saveNode} node={node} parentNodeId={contributionParentId} />
      {["project", "experience"].includes(node.type) ? <section className="grid gap-3 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-semibold">个人贡献</h2><p className="text-xs leading-5 text-muted-foreground">项目组成部分与个人贡献分开记录；贡献默认个人可见，归属需要本人核对。</p></div>
          <Link href={`/admin/nodes/new?type=contribution&parentNodeId=${encodeURIComponent(node.id)}`} className="rounded-md border border-border px-3 py-2 text-sm">新增贡献</Link>
        </div>
        {contributions.length ? <ul className="grid gap-2">{contributions.map((contribution) => contribution ? <li key={contribution.id} className="rounded-lg bg-muted/50 p-3">
          <Link href={`/admin/nodes/${contribution.id}`} className="font-medium underline underline-offset-4">{contribution.title}</Link>
          <p className="mt-1 text-xs text-muted-foreground">个人可见 · {contribution.contributionReview === "owner_confirmed" ? "本人已确认" : contribution.contributionReview === "system_verified" ? "系统事实可核对，个人归属未核验" : "个人归属待本人确认"}</p>
          {contribution.summary ? <p className="mt-2 text-sm leading-6">{contribution.summary}</p> : null}
        </li> : null)}</ul> : <p className="text-sm text-muted-foreground">尚无贡献记录。可从候选清单创建，也可以逐条新增。</p>}
      </section> : null}
      {snapshot ? (
        <section className="grid gap-2 rounded-xl border border-border p-4 text-sm">
          <h2 className="font-medium">来源快照</h2>
          <p className="text-muted-foreground">
            {node.sourceExternalId}
            {node.sourcePrivate ? " · 来源本身不公开" : " · 来源公开"}
            {snapshot.fetchedAt ? ` · 拉取于 ${snapshot.fetchedAt.slice(0, 16).replace("T", " ")}` : ""}
          </p>
          {snapshot.readmeExcerpt ? <p className="leading-6 text-muted-foreground">{snapshot.readmeExcerpt}</p> : null}
          {snapshot.rootEntries && snapshot.rootEntries.length > 0 ? (
            <p className="text-xs text-muted-foreground">根目录：{snapshot.rootEntries.map((entry) => entry.name).join("、")}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">README 摘录和目录只供核对，不会写进说明层，也不会送到公开接口。</p>
        </section>
      ) : null}
      <form action={removeNode}>
        <input type="hidden" name="id" value={node.id} />
        <Button type="submit" variant="destructive">
          删除节点
        </Button>
      </form>
    </main>
  );
}
