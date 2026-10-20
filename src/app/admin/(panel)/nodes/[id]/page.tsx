import { notFound } from "next/navigation";
import { NodeForm } from "@/components/node-form";
import { Button } from "@/components/ui/button";
import { getNode } from "@/db/store";
import { removeNode, saveNode } from "../../../actions";

export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  saved: "已保存。",
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
  const query = await searchParams;
  const node = getNode(id);
  if (!node) notFound();
  const noticeKey = typeof query.notice === "string" ? query.notice : "";
  const snapshot = node.sourceSnapshot;

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
      <NodeForm action={saveNode} node={node} />
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
