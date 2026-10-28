import Link from "next/link";
import { NetworkGraph } from "@/components/network-graph";
import { toNetworkData } from "@/lib/network";
import { visibleGraph } from "@/domain/graph";
import { views } from "@/domain/registry";
import { listEdges, listNodes } from "@/db/store";

export const dynamic = "force-dynamic";

const kindLabel: Record<string, string> = {
  network: "节点图",
  template: "简历概览",
  rank: "排序",
  axis3: "三维网格",
  traverse: "沿连接深入",
};

export default function HomePage() {
  const graph = visibleGraph(listNodes("public"), listEdges("public"), "public");
  const network = toNetworkData(graph.nodes, graph.edges);
  return (
    <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6">
      <section className="grid max-w-3xl gap-2">
        <p className="text-sm text-muted-foreground">个人工作图谱</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">项目、方向、经历与作品，连成一张可以继续理解的图。</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          同一份图谱可以按简历、时间、重要性、规模、联系或三维坐标浏览；进入项目后，还可以沿结构和运行过程继续阅读。
        </p>
        <p className="text-sm text-muted-foreground">
          当前公开图谱有 {graph.nodes.length} 个节点、{graph.edges.length} 条连接。
          {graph.nodes.length === 0 ? "还没有公开内容。" : ""}
        </p>
      </section>
      <Link href="/project/hublink" className="group grid gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-accent md:grid-cols-[1fr_auto] md:items-center md:p-6">
        <span className="grid gap-2">
          <span className="text-xs font-semibold tracking-[0.16em] text-primary">项目案例 · 原型建设中</span>
          <span className="text-2xl font-semibold">Hublink</span>
          <span className="max-w-2xl text-sm leading-6 text-muted-foreground">个人工作图谱本身。查看它由哪些部分组成、访客阅读和后台写入如何运行，以及还有哪些内容需要由项目参与者解释。</span>
        </span>
        <span className="text-sm font-medium group-hover:underline">阅读项目 →</span>
      </Link>
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
