import { notFound, redirect } from "next/navigation";
import { ResumeDraftEditor } from "@/components/resume-draft-editor";
import { getResumeDraft, listEdges, listNodes } from "@/db/store";
import { resumeCandidateGroups } from "@/domain/resume-draft";
import { isAdmin } from "@/lib/session";
import { saveResumeDraftAction } from "../../../../actions";

export const dynamic = "force-dynamic";

export default async function EditResumeDraftPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { id } = await params;
  const draft = getResumeDraft(id);
  if (!draft) notFound();
  const [nodes, edges, query] = [listNodes("all"), listEdges(), await searchParams] as const;
  const groups = resumeCandidateGroups(nodes, edges);
  return <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
    <header className="grid gap-2"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Private draft editor</p><h1 className="text-3xl font-semibold">编辑私人简历草稿</h1><p className="max-w-3xl text-sm leading-6 text-muted-foreground">原始图谱事实不会被简历改写覆盖。带“待本人确认”的贡献会在预览中继续显示待核对提示。</p></header>
    <ResumeDraftEditor draft={draft} groups={groups} action={saveResumeDraftAction} notice={query.notice} />
  </main>;
}
