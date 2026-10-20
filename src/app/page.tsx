import Link from "next/link";
import { views } from "@/domain/registry";
import { counts } from "@/db/store";

export const dynamic = "force-dynamic";

const kindLabel: Record<string, string> = {
  template: "固定版式",
  rank: "排序",
  axis3: "三维网格",
  traverse: "沿连接深入",
};

export default function HomePage() {
  const tally = counts();
  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-10">
      <section className="grid max-w-3xl gap-4">
        <p className="text-sm text-muted-foreground">阅读入口</p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">从不同的问题进入同一个人。</h1>
        <p className="text-base leading-7 text-muted-foreground">
          这里是一张图。节点记下工作、经历、方向和账号；连接记下它们如何组成、如何证明、如何前后相续。下面每一种阅览只是一种排法。
        </p>
        <p className="text-sm text-muted-foreground">
          公开节点 {tally.publicNodes} 个，连线 {tally.edges} 条。个人节点 {tally.personalNodes} 个，只在后台可见。
          {tally.publicNodes === 0 ? " 内容还没有写入，框架已经可以浏览。" : ""}
        </p>
      </section>
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
