import Link from "next/link";
import { redirect } from "next/navigation";
import { listResumeDrafts } from "@/db/store";
import { isAdmin } from "@/lib/session";
import { createStarterResumeDraft } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function ResumeDraftsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { notice } = await searchParams;
  const drafts = listResumeDrafts();
  return <main className="mx-auto grid max-w-5xl gap-7 px-4 py-8">
    <header className="grid gap-2"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Private resume drafts</p><h1 className="text-3xl font-semibold">私人简历草稿</h1><p className="max-w-3xl text-sm leading-6 text-muted-foreground">这里保存岗位目标、项目/贡献选择和简历专用文案。当前只允许管理员预览；“本人确认”状态仍需你逐项核对。</p></header>
    {notice ? <p role="status" className="rounded-lg border border-border p-3 text-sm">{notice === "starter-created" ? "目标简历草稿已创建。" : notice === "no-project" ? "没有找到 Hublink 项目节点。" : notice === "invalid-json" ? "草稿 JSON 无法解析，未保存。" : "请求未完成，请检查输入或候选贡献。"}</p> : null}
    <section className="grid gap-3 rounded-2xl border border-border p-5">
      <h2 className="font-semibold">建立验证稿</h2>
      <p className="text-sm leading-6 text-muted-foreground">先建立彼此独立的私人草稿，再从管理员可访问的项目和贡献中手动选择内容。</p>
      <div className="flex flex-wrap gap-3">
        <form action={createStarterResumeDraft}><input type="hidden" name="kind" value="a" /><button className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">创建目标稿 A</button></form>
        <form action={createStarterResumeDraft}><input type="hidden" name="kind" value="b" /><button className="rounded-full border border-border px-4 py-2 text-sm">创建对照稿 B</button></form>
        <Link href="/admin/resume/drafts/new" className="rounded-full border border-border px-4 py-2 text-sm">新建空白草稿</Link>
      </div>
    </section>
    <section className="grid gap-3"><h2 className="font-semibold">已保存草稿</h2>{drafts.length ? drafts.map((draft) => <article key={draft.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4">
      <div><h3 className="font-semibold">{draft.title}</h3><p className="text-sm text-muted-foreground">目标：{draft.targetRole} · {draft.content.entries.length} 项经历 · 更新 {new Date(draft.updatedAt).toLocaleString("zh-HK")}</p></div>
      <div className="flex gap-3"><Link className="underline underline-offset-4" href={`/admin/resume/drafts/${draft.id}`}>编辑</Link><Link className="underline underline-offset-4" href={`/admin/resume/drafts/${draft.id}/preview`}>私人预览</Link></div>
    </article>) : <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">还没有私人简历草稿。</p>}</section>
    <p className="text-xs leading-5 text-muted-foreground">旧的“公开项目投影审核”仍在 <Link href="/admin/resume" className="underline">/admin/resume</Link> 本页的下方；保存草稿不会更改它，也不会更改 `/resume`。</p>
  </main>;
}
