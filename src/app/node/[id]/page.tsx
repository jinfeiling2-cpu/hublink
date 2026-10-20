import Link from "next/link";
import { notFound } from "next/navigation";
import { publicSnapshot } from "@/domain/graph";
import { categories, edgeTypeById, nodeTypeById } from "@/domain/registry";
import { listEdges, listNodes } from "@/db/store";
import { statusText, trimNumber, typeLabel, visibilityLabel, whenLabel } from "@/lib/present";

export const dynamic = "force-dynamic";

export default async function NodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nodes = listNodes();
  const edges = listEdges();
  const node = nodes.find((item) => item.id === id);
  if (!node || node.visibility !== "public") notFound();
  const definition = nodeTypeById(node.type);
  const outgoing = edges.filter((edge) => edge.sourceId === node.id && nodes.some((item) => item.id === edge.targetId && item.visibility === "public"));
  const incoming = edges.filter((edge) => edge.targetId === node.id && nodes.some((item) => item.id === edge.sourceId && item.visibility === "public"));
  const byId = new Map(nodes.map((item) => [item.id, item]));
  const snapshot = publicSnapshot(node.sourceSnapshot);
  const categoryLabels = node.categoryIds
    .map((categoryId) => categories.find((item) => item.id === categoryId)?.label)
    .filter(Boolean);

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 py-10">
      <header className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          {typeLabel(node.type)}
          {node.status ? ` · ${statusText(node.status)}` : ""} · {visibilityLabel(node.visibility)}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">{node.title}</h1>
        {(node.role || node.outcome) && (
          <p className="text-sm leading-6 text-muted-foreground">
            {node.role ? `角色 ${node.role}` : ""}
            {node.role && node.outcome ? " · " : ""}
            {node.outcome ? `结果 ${node.outcome}` : ""}
          </p>
        )}
        <p className="text-lg leading-8">{node.summary || "识别层还空着。"}</p>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <Fact label="时间" value={whenLabel(node)} />
        <Fact label="规模" value={trimNumber(node.scale)} />
        <Fact label="重要性" value={trimNumber(node.importance)} />
        <Fact label="亲疏" value={trimNumber(node.centrality)} />
      </dl>

      {categoryLabels.length > 0 ? <p className="text-sm text-muted-foreground">{categoryLabels.join(" · ")}</p> : null}

      <section className="grid gap-2">
        <h2 className="text-sm font-medium">说明</h2>
        {node.body ? (
          <p className="leading-7 whitespace-pre-wrap">{node.body}</p>
        ) : (
          <p className="text-sm text-muted-foreground">说明层还没有写。读者若要继续，可以看下面的连接，或从出口去原文。</p>
        )}
      </section>

      <RelationGroup title="向外" edges={outgoing} byId={byId} direction="out" empty={definition?.layers.includes("internal") ? "内部还没有拆开。架构部分、运行步骤和决策会以连接出现在这里。" : "没有向外的公开连接。"} />
      <RelationGroup title="被连接" edges={incoming} byId={byId} direction="in" empty="没有别的公开节点指向这里。" />

      <section className="grid gap-2">
        <h2 className="text-sm font-medium">出口</h2>
        {node.primaryUrl || node.exitLinks.length > 0 ? (
          <ul className="grid gap-1 text-sm">
            {node.primaryUrl ? (
              <li>
                <a href={node.primaryUrl} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                  主链接
                </a>
              </li>
            ) : null}
            {node.exitLinks.map((link) => (
              <li key={link.url}>
                <a href={link.url} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">还没有出口。</p>
        )}
        {snapshot ? (
          <p className="text-xs leading-5 text-muted-foreground">
            来源核对：{snapshot.language || "语言未标"}
            {snapshot.pushedAt ? ` · 最近更新 ${snapshot.pushedAt.slice(0, 10)}` : ""}
            {typeof snapshot.stars === "number" ? ` · ${snapshot.stars} 星` : ""}
            。这段事实来自外部快照，不是说明层。
          </p>
        ) : null}
      </section>

      <p>
        <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">
          返回阅读入口
        </Link>
      </p>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function RelationGroup({
  title,
  edges,
  byId,
  direction,
  empty,
}: {
  title: string;
  edges: { id: string; type: string; sourceId: string; targetId: string }[];
  byId: Map<string, { id: string; title: string }>;
  direction: "out" | "in";
  empty: string;
}) {
  return (
    <section className="grid gap-2">
      <h2 className="text-sm font-medium">{title}</h2>
      {edges.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="grid gap-2">
          {edges.map((edge) => {
            const otherId = direction === "out" ? edge.targetId : edge.sourceId;
            const other = byId.get(otherId);
            if (!other) return null;
            return (
              <li key={edge.id} className="text-sm">
                <span className="text-muted-foreground">{edgeTypeById(edge.type)?.label ?? edge.type}</span>
                {" · "}
                <Link href={`/node/${other.id}`} className="underline underline-offset-4">
                  {other.title}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
