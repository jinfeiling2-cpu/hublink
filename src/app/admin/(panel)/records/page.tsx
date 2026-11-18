import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import { readPrivateRecordFile } from "@/domain/private-records";
import { createPrivateEpisodeAction } from "../../actions";

export const dynamic = "force-dynamic";

const statusLabel = { draft: "草稿", active: "进行中", completed: "已完成", archived: "已归档" } as const;

export default async function PrivateRecordsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { notice } = await searchParams;
  const file = readPrivateRecordFile();
  const episodes = [...file.episodes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <main className="mx-auto grid max-w-5xl gap-7 px-4 py-8">
    <header className="grid gap-2">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Private thinking & action log</p>
      <h1 className="text-3xl font-semibold tracking-tight">想法与决策记录</h1>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">先用一句话记下想法或决定，之后再补背景、目标、约束、来源、行动与反馈。内容只保存在本机私人档案，不会进入公开图谱、API 或简历。</p>
    </header>
    {notice === "invalid" ? <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm">标题或记录类型无效，没有保存。</p> : null}
    <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
      <div><h2 className="text-xl font-semibold">快速记录</h2><p className="mt-1 text-sm text-muted-foreground">先保存最小草稿，留空的结构化字段之后再补。</p></div>
      <form action={createPrivateEpisodeAction} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="grid gap-1.5 text-sm">标题<input name="title" required maxLength={200} placeholder="正在想什么，或需要作出什么决定？" className="h-10 rounded-lg border border-input bg-transparent px-3" /></label>
          <label className="grid gap-1.5 text-sm">记录类型<select name="kind" className="h-10 rounded-lg border border-input bg-background px-3"><option value="thought">想法</option><option value="decision">决定</option></select></label>
        </div>
        <label className="grid gap-1.5 text-sm">先记一段（可选）<textarea name="body" maxLength={10000} rows={3} placeholder="不必完整，也不必先解释清楚。" className="rounded-lg border border-input bg-transparent p-3 leading-6" /></label>
        <button className="w-fit rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">保存私人草稿</button>
      </form>
    </section>
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-semibold">记录档案</h2><p className="text-sm text-muted-foreground">{episodes.length} 条记录 · 私人草稿与已归档记录都保留在这里</p></div></div>
      {episodes.length ? episodes.map((episode) => <article key={episode.id} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="grid gap-1"><p className="text-xs text-muted-foreground">{episode.kind === "decision" ? "决策记录" : "想法记录"} · {statusLabel[episode.status]} · private · 更新 {new Date(episode.updatedAt).toLocaleString("zh-HK")}</p><h3 className="font-semibold">{episode.title}</h3>{episode.body ? <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{episode.body}</p> : null}<p className="text-xs text-muted-foreground">{episode.sources.length} 来源 · {episode.claims.length} 主张 · {episode.actions.length} 行动 · {episode.feedback.length} 反馈</p></div>
        <Link href={`/admin/records/${episode.id}`} className="w-fit rounded-full border border-border px-4 py-2 text-sm">打开与补充</Link>
      </article>) : <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">还没有记录。先从一个问题或决定开始即可。</p>}
    </section>
  </main>;
}
