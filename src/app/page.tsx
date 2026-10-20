import Link from "next/link";
import { NetworkGraph } from "@/components/network-graph";
import { toNetworkData } from "@/lib/network";
import { visibleGraph } from "@/domain/graph";
import { views } from "@/domain/registry";
import { counts, listEdges, listNodes } from "@/db/store";

export const dynamic = "force-dynamic";

const kindLabel: Record<string, string> = {
  network: "节点图",
  template: "固定版式",
  rank: "排序",
  axis3: "三维网格",
  traverse: "沿连接深入",
};

export default function HomePage() {
  const tally = counts();
  const graph = visibleGraph(listNodes("public"), listEdges("public"), "public");
  const network = toNetworkData(graph.nodes, graph.edges);
  return (
    <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6">
      <section className="grid max-w-3xl gap-2">
        <p className="text-sm text-muted-foreground">阅读入口</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">从不同的问题进入同一个人。</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          圆是点，线是关系。大圆是枢纽，同一颜色聚成一簇。点一下，只亮出直接相连的点。下面其他阅览是把同一张图换一种排法。
        </p>
        <p className="text-sm text-muted-foreground">
          公开节点 {tally.publicNodes} 个，连线 {tally.edges} 条。个人节点 {tally.personalNodes} 个，只在后台可见。
          {tally.publicNodes === 0 ? " 内容还没有写入，框架已经可以浏览。" : ""}
        </p>
      </section>
      {graph.nodes.length > 0 ? (
        <section className="rounded-2xl border border-border bg-[#243038] px-3 py-4 text-slate-100 md:px-5">
          <NetworkGraph nodes={network.nodes} edges={network.edges} height={720} />
        </section>
      ) : null}
      <section className="grid gap-3">
        {views.map((view) => (
          <Link
            key={view.id}
            href={`/view/${view.id}`}
            className="grid gap-1 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:bg-accent md:grid-cols-[9rem_1fr] md:items-baseline"
          >
            <span className="text-xs tracking-wide text-muted-foreground">{kindLabel[view.kind]}</span>
            <span className="grid gap-1">
              <span className="font-medium">{view.name}</span>
              <span className="text-sm leading-6 text-muted-foreground">{view.question}</span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
