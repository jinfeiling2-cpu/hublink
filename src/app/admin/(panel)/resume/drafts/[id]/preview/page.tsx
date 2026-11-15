import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getResumeDraft } from "@/db/store";
import { statusLabel } from "@/domain/resume-draft";
import { isAdmin } from "@/lib/session";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function PrivateResumePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { id } = await params;
  const draft = getResumeDraft(id);
  if (!draft) notFound();
  return <main className="mx-auto grid max-w-[8.5in] gap-5 px-4 py-8 print:max-w-none print:p-0">
    <nav className="flex flex-wrap gap-4 text-sm print:hidden"><Link className="underline" href={`/admin/resume/drafts/${draft.id}`}>返回编辑</Link><Link className="underline" href="/admin/resume/drafts">草稿列表</Link><PrintButton /></nav>
    <article className="resume-page grid gap-5 bg-white p-7 text-[#252525] shadow-sm print:p-0">
      <header className="grid gap-2 border-b-2 border-[#1f3b5c] pb-4"><p className="text-xs font-semibold tracking-[0.18em] text-amber-800">私人草稿 · 未公开 · 未经核对不得作为已确认履历</p><h1 className="text-3xl font-semibold text-[#1f3b5c]">{draft.title}</h1><p className="text-sm">目标：{draft.targetRole}</p><p className="text-xs text-muted-foreground">草稿更新：{new Date(draft.updatedAt).toLocaleString("zh-HK")} · 没有公开发布版本</p></header>
      <section className="grid gap-4"><h2 className="border-b border-[#1f3b5c] pb-1 text-lg font-semibold text-[#1f3b5c]">项目经历</h2>{draft.content.entries.length ? draft.content.entries.map((entry) => <section key={entry.sourceNodeId} className="grid gap-2 break-inside-avoid">
        <header className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{entry.title}</h3><p className="text-sm">{entry.role || "角色待本人核对"}</p></div><p className="text-sm">{entry.timeStart || "时间待补"}{entry.timeEnd ? ` - ${entry.timeEnd}` : entry.timeStart ? " - 至今/待核对" : ""}</p></header>
        <p className="text-sm leading-6">{entry.summary || "项目背景待补"}</p>
        {entry.targetFit !== "unset" ? <p className="text-xs text-muted-foreground">目标相关性：{entry.targetFit === "high" ? "高度相关" : entry.targetFit === "medium" ? "部分相关" : "暂不相关"}</p> : <p className="text-xs text-amber-800">目标相关性待本人判断</p>}
        {entry.contributions.length ? <ul className="grid gap-2 pl-5 text-sm">{entry.contributions.map((item) => <li key={item.sourceNodeId} className="list-disc leading-6"><span>{item.text}</span>{item.reviewStatus !== "owner_confirmed" ? <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{statusLabel(item.reviewStatus)}</span> : null}</li>)}</ul> : <p className="text-sm text-muted-foreground">尚未选择贡献。</p>}
        <p className="text-xs text-muted-foreground">私人来源引用：{[...entry.sourceRefs, ...entry.contributions.flatMap((item) => item.sourceRefs)].join(" · ") || "尚未记录"}</p>
      </section>) : <p className="text-sm text-muted-foreground">尚未加入项目经历。</p>}</section>
    </article>
  </main>;
}
