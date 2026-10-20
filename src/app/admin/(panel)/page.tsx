import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { edgeTypeById } from "@/domain/registry";
import { counts, listEdges, listNodes } from "@/db/store";
import { typeLabel, visibilityLabel } from "@/lib/present";
import { changeVisibility, removeEdge } from "../actions";

export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  deleted: "节点已删除。相连的线一并去掉了。",
  visibility: "可见性已更新。公开页只会看到公开节点。",
  edge: "连线已加上。",
  "edge-deleted": "连线已去掉。",
};

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const noticeKey = typeof query.notice === "string" ? query.notice : "";
  const nodes = listNodes();
  const edges = listEdges();
  const tally = counts();
  const titles = new Map(nodes.map((node) => [node.id, node.title]));

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">图的后台</h1>
        <p className="text-sm text-muted-foreground">
          公开 {tally.publicNodes} · 个人 {tally.personalNodes} · 连线 {tally.edges}
        </p>
        {notices[noticeKey] ? <p className="text-sm text-primary">{notices[noticeKey]}</p> : null}
      </header>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">节点</h2>
          <Button nativeButton={false} render={<Link href="/admin/nodes/new" />}>新建节点</Button>
        </div>
        {nodes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            还没有节点。可以从新建开始，或在来源页拉取一个 GitHub 仓库。
          </p>
        ) : (
          <ul className="grid gap-2">
            {nodes.map((node) => (
              <li key={node.id} className="grid gap-3 rounded-xl border border-border px-4 py-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <Link href={`/admin/nodes/${node.id}`} className="font-medium hover:underline">
                    {node.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {typeLabel(node.type)} · {visibilityLabel(node.visibility)}
                    {node.sourceKind ? ` · 来源 ${node.sourceKind}` : ""}
                  </p>
                </div>
                <form action={changeVisibility} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={node.id} />
                  <input type="hidden" name="visibility" value={node.visibility === "public" ? "personal" : "public"} />
                  <Badge variant={node.visibility === "public" ? "default" : "secondary"}>{visibilityLabel(node.visibility)}</Badge>
                  <Button type="submit" variant="outline" size="sm">
                    改为{node.visibility === "public" ? "个人" : "公开"}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">连线</h2>
          <Button variant="outline" nativeButton={false} render={<Link href="/admin/edges/new" />}>
            新建连线
          </Button>
        </div>
        {edges.length === 0 ? (
          <p className="text-sm text-muted-foreground">还没有连线。两个节点之间的组成、证据或历程从这里建立。</p>
        ) : (
          <ul className="grid gap-2">
            {edges.map((edge) => (
              <li key={edge.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm">
                <span>
                  {titles.get(edge.sourceId) ?? "已删除"}
                  <span className="text-muted-foreground"> — {edgeTypeById(edge.type)?.label ?? edge.type} → </span>
                  {titles.get(edge.targetId) ?? "已删除"}
                </span>
                <form action={removeEdge}>
                  <input type="hidden" name="id" value={edge.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    去掉
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
