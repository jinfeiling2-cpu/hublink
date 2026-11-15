import Link from "next/link";
import { profile } from "@/content/profile";

export const dynamic = "force-dynamic";

export default function AiContextPage() {
  return <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10">
    <header className="grid gap-3"><p className="text-sm text-muted-foreground">面向机器的公开资料</p><h1 className="text-4xl font-semibold tracking-tight">给 AI 的阅读入口</h1><p className="max-w-3xl text-base leading-8 text-muted-foreground">这是正式公开图谱的机器可读投影。它提供稳定的节点、连接、状态和继续阅读的 URL，不导出私人原文、后台审核记录或未批准的语料推断。</p></header>
    <section className="grid gap-4 rounded-2xl border border-border bg-card p-6"><h2 className="text-xl font-medium">当前上下文</h2><dl className="grid gap-3 text-sm leading-7 md:grid-cols-2"><div><dt className="text-muted-foreground">主体</dt><dd>{profile.nameZh} · {profile.nameEn}</dd></div><div><dt className="text-muted-foreground">核心方向</dt><dd>{profile.direction}</dd></div><div className="md:col-span-2"><dt className="text-muted-foreground">整体目标</dt><dd>{profile.alignmentAim}</dd></div><div className="md:col-span-2"><dt className="text-muted-foreground">网站作用</dt><dd>{profile.sitePurpose}</dd></div><div className="md:col-span-2"><dt className="text-muted-foreground">边界</dt><dd>{profile.siteBoundary}</dd></div></dl></section>
    <section className="grid gap-3"><h2 className="text-xl font-medium">如何读取</h2><div className="grid gap-3 md:grid-cols-2">{profile.readingPaths.map((path) => <Link key={path.href} href={path.href} className="rounded-xl border border-border p-4 hover:bg-accent"><strong>{path.label}</strong><p className="mt-1 text-sm leading-6 text-muted-foreground">{path.description}</p></Link>)}</div></section>
    <section className="grid gap-3 rounded-xl border border-border p-5"><h2 className="text-xl font-medium">机器接口</h2><p className="text-sm leading-7 text-muted-foreground">读取结构化图谱：<a className="underline" href="/api/context"><code>/api/context</code></a>。它是公开只读投影；状态为空时表示没有记录，不表示“已完成”或“没有问题”。每个节点和连接都可以返回网站继续阅读。</p></section>
  </main>;
}
