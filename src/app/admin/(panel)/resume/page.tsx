import Link from "next/link";
import { redirect } from "next/navigation";
import { listNodes, listResumeProjection } from "@/db/store";
import { listResumeCandidates } from "@/domain/resume-projection";
import { initializeHublinkContributionCandidates, reviewResumeProjection } from "../../actions";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ResumeProjectionPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  if (!(await isAdmin())) redirect("/admin/login");
  const candidates = listResumeCandidates(listNodes("public"), listResumeProjection());
  const selected = candidates.filter((candidate) => candidate.selected);
  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8">
      <header className="grid gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Resume projection</p>
        <h1 className="text-3xl font-semibold">简历投影审核</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          简历保留当前核准版本中的教育、研究项目、技能和论文。此处只管理从公开项目节点追加到简历的内容；候选评分只解释资料完整度，不会自动选入。私有节点、私有来源和经历证明不进入项目候选。
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/resume" className="underline underline-offset-4">查看当前简历 →</Link>
          <span>已审核选入 {selected.length} 项</span>
        </div>
      </header>

      <section className="grid gap-4 rounded-2xl border border-emerald-700/20 bg-emerald-50/60 p-5 text-emerald-950">
        <div className="grid gap-2"><h2 className="text-xl font-semibold">私人简历工作台</h2><p className="max-w-3xl text-sm leading-6">下方草稿可使用个人节点与未核对贡献；只有本管理员会话可读取。它与旧的公开简历投影审核分开保存，暂不提供匿名发布。</p></div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/resume/drafts" className="rounded-full bg-emerald-900 px-4 py-2 text-sm text-white">打开私人草稿</Link>
          <form action={initializeHublinkContributionCandidates}><button className="rounded-full border border-emerald-900/30 px-4 py-2 text-sm">初始化 3 条 Hublink 私人候选贡献</button></form>
        </div>
        {notice === "candidates-3" || notice === "candidates-0" ? <p role="status" className="text-sm">候选已处理。新增的贡献保持 personal 与待本人确认。</p> : null}
        {notice === "initialize-first" ? <p role="alert" className="text-sm">请先初始化 Hublink 候选贡献，再创建两份对照稿。</p> : null}
      </section>

      {notice === "saved" ? <p role="status" className="rounded border border-border p-3 text-sm">审核选择已保存，公开简历已重新读取图谱内容。</p> : null}
      {notice === "ineligible" ? <p role="alert" className="rounded border border-amber-500/40 p-3 text-sm">该节点已不符合公开项目条件，因此没有进入简历。</p> : null}
      {notice === "invalid" ? <p role="alert" className="rounded border border-amber-500/40 p-3 text-sm">节点或排序信息无效，没有保存。</p> : null}

      {candidates.length ? <section className="grid gap-4">
        {candidates.map((candidate) => <article key={candidate.node.id} className="grid gap-4 rounded-lg border border-border p-4 md:grid-cols-[1fr_auto]">
          <div className="grid content-start gap-2">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-lg font-semibold">{candidate.node.title}</h2>
              <code className="text-xs text-muted-foreground">{candidate.node.id}</code>
            </div>
            <p className="text-sm leading-6">{candidate.node.summary || "缺少公开简介"}</p>
            <p className="text-sm text-muted-foreground">角色：{candidate.node.role || "未填写"} · 状态：{candidate.node.status || "未填写"}</p>
            <p className="text-sm text-muted-foreground">成果/阶段：{candidate.node.outcome || "未填写"}</p>
            <div className="grid gap-1 text-xs text-muted-foreground">
              <p>资料评分 {candidate.score}/3；{candidate.reasons.join("；") || "暂无可用依据"}。</p>
              {candidate.cautions.length ? <p className="text-amber-700">核对提示：{candidate.cautions.join("；")}。</p> : <p>暂未发现结构性缺项，具体表述仍需审核。</p>}
              {candidate.reviewedAt ? <p>上次审核：{new Date(candidate.reviewedAt).toLocaleString("zh-HK")}</p> : <p>尚未作出选入或排除决定。</p>}
            </div>
          </div>
          <form action={reviewResumeProjection} className="grid content-start gap-3 md:min-w-44">
            <input type="hidden" name="nodeId" value={candidate.node.id} />
            <label className="grid gap-1 text-sm">简历顺序
              <input name="position" type="number" min="1" defaultValue={candidate.selected ? candidate.position : selected.length + 1} className="w-24 rounded border border-border bg-background px-2 py-1" />
            </label>
            <button name="selected" value={candidate.selected ? "false" : "true"} className="rounded border border-border px-3 py-2 text-sm hover:bg-muted">
              {candidate.selected ? "从简历移除" : "审核并选入简历"}
            </button>
          </form>
        </article>)}
      </section> : <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">当前没有来源公开的项目节点。先在节点后台补齐项目和公开来源，再回来审核。</p>}

      <section className="grid gap-2 border-t border-border pt-5 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">投影规则</h2>
        <p>公开简历只读取已审核的公开项目节点。选择后，节点标题、摘要、角色、阶段和日期会从图谱实时读取；编辑节点会更新投影，撤销公开或删除节点会让它自动退出。</p>
        <p>这轮暂不把科大讯飞证明转换成经历：证明只能支持经历存在，岗位、时间、职责和个人贡献仍需单独确认。</p>
        <p>候选推荐接口定义在 <code>src/domain/resume-projection.ts</code>；当前使用透明的本地资料完整度提示，没有配置外部 API。</p>
      </section>
    </main>
  );
}
