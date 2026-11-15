import Link from "next/link";
import { listEdges, listNodes } from "@/db/store";
import { NetworkGraph } from "@/components/network-graph";
import { toNetworkData } from "@/lib/network";

export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  const nodes = listNodes("public");
  const edges = listEdges("public");
  const projects = nodes.filter((node) => node.type === "project" && node.sourceKind === "github");
  const projectIds = new Set(projects.map((node) => node.id));
  const ids = new Set(["person.public", ...projectIds]);
  for (const edge of edges) {
    if (projectIds.has(edge.sourceId) && ["related_to", "embodies", "contributes_to"].includes(edge.type)) ids.add(edge.targetId);
  }
  const network = toNetworkData(nodes.filter((node) => ids.has(node.id)), edges.filter((edge) => ids.has(edge.sourceId) && ids.has(edge.targetId)));
  return <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10">
    <header className="grid max-w-3xl gap-4">
      <p className="text-sm text-muted-foreground">从项目进入思考框架</p>
      <h1 className="text-4xl font-semibold tracking-tight">项目在主干中的位置</h1>
      <p className="leading-8 text-muted-foreground">先看一件工作为什么值得做，再沿着关系读它与方向、证据、行动和共同学习的联系。公开仓库可以继续展开结构；思想关联是可修订的分析，不代替本人对项目贡献与效果的说明。</p>
    </header>
    <section className="rounded-2xl border border-border bg-[#243038] p-4 text-slate-100 md:p-6">
      <NetworkGraph nodes={network.nodes} edges={network.edges} height={640} initialSelected={projectIds.values().next().value ?? "person.public"} />
    </section>
    <section className="grid gap-4 md:grid-cols-2">
      {projects.map((project) => <article key={project.id} className="grid content-start gap-4 rounded-2xl border border-border bg-card p-6">
        <p className="text-xs text-muted-foreground">{project.sourcePrivate ? "思想概要 · 程序结构不公开" : "公开仓库 · 可继续读结构"}</p>
        <h2 className="text-xl font-semibold"><Link href={`/node/${project.id}`} className="hover:underline">{project.title}</Link></h2>
        <p className="text-sm leading-7 text-muted-foreground">{project.summary}</p>
        {project.sourceSnapshot?.revision && !project.sourcePrivate ? <p className="text-xs text-muted-foreground">读取版本 {project.sourceSnapshot.revision.slice(0, 12)} · {project.sourceSnapshot.fetchedAt.slice(0, 10)}</p> : null}
        <Link href={`/node/${project.id}`} className="w-fit text-sm text-[#315c55] underline underline-offset-4">阅读项目、关系与内部图 →</Link>
      </article>)}
      {!projects.length ? <p className="text-sm text-muted-foreground">公开项目尚未录入。项目读取结果可在后台来源页核对。</p> : null}
    </section>
    <p className="text-sm leading-7 text-muted-foreground">关系线上的文字说明共享问题或可能贡献，粗细是人工整理权重。计划、仓库文档中的进度与经实际运行验证的结果需要分别阅读。<Link href="/view/network" className="ml-2 underline">返回完整公开图 →</Link></p>
  </main>;
}
