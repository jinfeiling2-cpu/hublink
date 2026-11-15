import Link from "next/link";
import { redirect } from "next/navigation";
import { createResumeDraftAction } from "../../../../actions";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewResumeDraftPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { notice } = await searchParams;
  return <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
    <Link href="/admin/resume/drafts" className="text-sm text-muted-foreground underline">← 返回草稿列表</Link>
    <header className="grid gap-2"><h1 className="text-3xl font-semibold">新建空白简历草稿</h1><p className="text-sm leading-6 text-muted-foreground">草稿初始无项目条目。保存后可从管理员可见的项目、经历和贡献中选择。</p></header>
    {notice === "invalid" ? <p role="alert" className="text-sm text-destructive">标题与目标读者均需填写。</p> : null}
    <form action={createResumeDraftAction} className="grid gap-4 rounded-xl border border-border p-5">
      <label className="grid gap-1.5 text-sm">私人标题<input required maxLength={120} name="title" placeholder="例如：研究工程实习项目经历稿" className="h-10 rounded-lg border border-input bg-transparent px-3" /></label>
      <label className="grid gap-1.5 text-sm">目标岗位或读者<input required maxLength={240} name="targetRole" placeholder="描述希望这份简历回答的问题" className="h-10 rounded-lg border border-input bg-transparent px-3" /></label>
      <button className="w-fit rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">创建私人草稿</button>
    </form>
  </main>;
}
