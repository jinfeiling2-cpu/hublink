import { sourceAdapters } from "@/domain/registry";
import Link from "next/link";
import { listNodes } from "@/db/store";
import { GithubForm, XiaohongshuForm } from "./source-forms";

export const dynamic = "force-dynamic";

export default function SourcesPage() {
  const github = sourceAdapters.find((item) => item.id === "github");
  const xiaohongshu = sourceAdapters.find((item) => item.id === "xiaohongshu");
  const readings = listNodes().filter((node) => node.sourceKind === "github" && node.type === "project");
  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 py-8">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">来源</h1>
        <p className="text-sm leading-6 text-muted-foreground">拉取只填写快照和新建时的简介。说明层、架构和可见性的后续修改都留在节点上。</p>
      </header>
      <section className="grid gap-4 rounded-xl border border-border p-4">
        <div>
          <h2 className="font-medium">GitHub</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{github?.summary}</p>
        </div>
        <GithubForm />
        <div className="grid gap-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium">已分析的仓库项目</h3>
          <p className="text-xs leading-6 text-muted-foreground">公开项目可展开架构。私有项目按文档阅读，仅保留项目与思想关系；此处显示个人数据，公开项目地图按节点可见性筛选。</p>
          {readings.map((node) => <div key={node.id} className="grid gap-1 rounded-lg bg-muted/50 p-3 text-sm">
            <Link href={`/admin/nodes/${node.id}`} className="font-medium underline underline-offset-4">{node.title}</Link>
            <p className="text-xs text-muted-foreground">{node.sourcePrivate ? "私有来源 · 思想阅读" : "公开来源 · 可读架构"} · {node.visibility === "public" ? "节点公开" : "个人节点"}{node.sourceSnapshot?.revision ? ` · ${node.sourceSnapshot.revision.slice(0, 12)}` : ""}</p>
            <p className="text-xs leading-6 text-muted-foreground">{node.summary}</p>
          </div>)}
          <div className="flex gap-4 text-sm"><Link href="/admin/graph" className="underline">核对个人全图 →</Link><Link href="/projects" className="underline">查看公开项目地图 →</Link></div>
        </div>
      </section>
      <section className="grid gap-4 rounded-xl border border-border p-4">
        <div>
          <h2 className="font-medium">小红书</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{xiaohongshu?.summary}</p>
        </div>
        <XiaohongshuForm />
      </section>
    </main>
  );
}
