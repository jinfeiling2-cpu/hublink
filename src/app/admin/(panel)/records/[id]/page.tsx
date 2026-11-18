import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listNodes } from "@/db/store";
import { isAdmin } from "@/lib/session";
import { readPrivateRecordFile } from "@/domain/private-records";
import {
  addPrivateActionAction,
  addPrivateClaimAction,
  addPrivateFeedbackAction,
  addPrivateSourceAction,
  reviewPrivateClaimAction,
  reviewPrivateSourceAction,
  updatePrivateEpisodeAction,
  updatePrivateActionResultAction,
} from "../../../actions";

export const dynamic = "force-dynamic";

const claimTypeLabels = {
  verified_fact: "可证事实", self_reported: "本人自述", user_judgment: "本人判断", ai_inference: "AI 推断",
  hypothesis: "假设", speculative_vision: "推测性远景", deprecated_belief: "已修正观点",
} as const;
const claimStatusLabels = { candidate: "候选", needs_review: "待核对", confirmed: "已确认", rejected: "已否定", superseded: "已被替代", stale: "待更新" } as const;

export default async function PrivateRecordDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const episode = readPrivateRecordFile().episodes.find((item) => item.id === id);
  if (!episode) notFound();
  const allNodes = listNodes("all");
  const projects = allNodes.filter((node) => ["project", "experience"].includes(node.type));
  const goals = allNodes.filter((node) => ["goal", "direction"].includes(node.type));
  const noticeText: Record<string, string> = {
    saved: "记录已保存。", invalid: "输入无效，没有保存。", "invalid-project": "只能关联已有项目或经历。", "invalid-goal": "只能关联已有目标或方向节点。",
    "source-added": "来源引用已添加。", "invalid-source": "来源引用无效，没有保存。",
    "claim-added": "主张已添加。", "invalid-claim": "主张无效，或引用了不存在的来源。",
    "action-added": "行动已添加。", "invalid-action": "行动无效，或引用了不存在的来源。",
    "feedback-added": "反馈已添加。", "invalid-feedback": "反馈无效，或引用了不存在的来源。",
    "claim-reviewed": "主张核对状态已更新，旧状态保留在版本记录。", "source-reviewed": "来源核对状态已更新，旧状态保留在版本记录。",
    "invalid-review": "找不到对应主张或来源，状态未更改。",
    "action-updated": "行动结果已更新，旧状态保留在版本记录。", "invalid-action-update": "行动更新无效，没有保存。",
  };
  const history = readPrivateRecordFile().history.filter((item) => item.episodeId === id).slice(-12).reverse();
  return <main className="mx-auto grid max-w-5xl gap-7 px-4 py-8">
    <Link href="/admin/records" className="w-fit text-sm text-muted-foreground underline">← 返回记录</Link>
    <header className="grid gap-2"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Private · {episode.status}</p><h1 className="text-3xl font-semibold tracking-tight">{episode.title}</h1><p className="max-w-3xl text-sm leading-6 text-muted-foreground">保存内容只用于私人整理。主张状态由管理员会话明确更新；AI 推断不会自动确认。系统记录核对时间和管理会话类型，但不区分具体管理员身份。归档不会删除记录。</p></header>
    {query.notice && noticeText[query.notice] ? <p role={query.notice.startsWith("invalid") ? "alert" : "status"} className="rounded-lg border border-border p-3 text-sm">{noticeText[query.notice]}</p> : null}
    <section className="grid gap-4 rounded-2xl border border-border p-5">
      <h2 className="text-xl font-semibold">记录与对齐情境</h2>
      <form action={updatePrivateEpisodeAction} className="grid gap-4">
        <input type="hidden" name="id" value={episode.id} />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">标题<input name="title" required maxLength={200} defaultValue={episode.title} className="h-10 rounded-lg border border-input bg-transparent px-3" /></label>
          <label className="grid gap-1 text-sm">类型<select name="kind" defaultValue={episode.kind} className="h-10 rounded-lg border border-input bg-background px-3"><option value="thought">想法</option><option value="decision">决策 episode</option></select></label>
          <label className="grid gap-1 text-sm">状态<select name="status" defaultValue={episode.status} className="h-10 rounded-lg border border-input bg-background px-3"><option value="draft">草稿</option><option value="active">进行中</option><option value="completed">已完成</option><option value="archived">已归档（可恢复）</option></select></label>
        </div>
        <Field label="快速记录" name="body" value={episode.body} rows={3} />
        <div className="grid gap-3 md:grid-cols-2"><Field label="情境" name="context" value={episode.context} /><Field label="当前状态" name="currentState" value={episode.currentState} /><Field label="目标与价值" name="goalsAndValues" value={episode.goalsAndValues} /><Field label="现实约束" name="constraints" value={episode.constraints} /><Field label="可选行动（每行一项）" name="options" value={episode.options.join("\n")} /><Field label="预期结果" name="expectedOutcomes" value={episode.expectedOutcomes} /><Field label="证据与不确定性" name="evidenceAndUncertainty" value={episode.evidenceAndUncertainty} /><Field label="本人决定" name="decision" value={episode.decision} /><Field label="理由" name="reasons" value={episode.reasons} /><Field label="放弃的选项（每行一项）" name="rejectedOptions" value={episode.rejectedOptions.join("\n")} /></div>
        <fieldset className="grid gap-2"><legend className="text-sm font-medium">关联项目或经历（可选）</legend>{projects.length ? <div className="grid gap-2 sm:grid-cols-2">{projects.map((project) => <label key={project.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm"><input type="checkbox" name="projectIds" value={project.id} defaultChecked={episode.projectIds.includes(project.id)} />{project.title}</label>)}</div> : <p className="text-sm text-muted-foreground">当前没有项目/经历节点。</p>}</fieldset>
        <fieldset className="grid gap-2"><legend className="text-sm font-medium">关联目标或方向（可选）</legend>{goals.length ? <div className="grid gap-2 sm:grid-cols-2">{goals.map((goal) => <label key={goal.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm"><input type="checkbox" name="goalIds" value={goal.id} defaultChecked={episode.goalIds.includes(goal.id)} />{goal.title}</label>)}</div> : <p className="text-sm text-muted-foreground">当前没有目标/方向节点。也可先在文字字段记录目标。</p>}</fieldset>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="reviewed" defaultChecked={false} />我这次完成了本人复核，更新最近核对时间</label>
        <button className="w-fit rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">保存记录</button>
      </form>
    </section>
    <section className="grid gap-4 rounded-2xl border border-border p-5">
      <div><h2 className="text-xl font-semibold">来源与证据</h2><p className="mt-1 text-sm text-muted-foreground">只记录定位和短摘要，不在这里复制整篇原文；标记为私有。</p></div>
      {episode.sources.map((source) => <article key={source.id} className="grid gap-2 border-t border-border pt-3"><h3 className="font-medium">{source.title} <span className="text-xs text-muted-foreground">· {source.sourceType} · {source.verificationStatus} · private</span></h3><p className="break-all text-sm text-muted-foreground">{source.locator || "未提供定位"}</p>{source.summary ? <p className="text-sm leading-6">{source.summary}</p> : null}<p className="text-xs text-muted-foreground">适用范围：{source.scope || "未记录"} · 引用 ID：{source.id} · {source.checkedBy ? "由管理员会话核对" : "尚无核对记录"}</p><form action={reviewPrivateSourceAction} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={episode.id} /><input type="hidden" name="sourceId" value={source.id} /><label className="text-xs">更新核对<select name="verificationStatus" defaultValue={source.verificationStatus} className="ml-2 h-9 rounded-lg border border-input bg-background px-2"><option value="candidate">候选</option><option value="needs_review">待核对</option><option value="confirmed">已核对</option><option value="stale">需更新</option></select></label><button className="rounded-full border border-border px-3 py-1.5 text-xs">保存来源状态</button></form></article>)}
      <form action={addPrivateSourceAction} className="grid gap-3 border-t border-border pt-4">
        <input type="hidden" name="id" value={episode.id} /><h3 className="font-medium">添加来源引用</h3>
        <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">来源类型<select name="sourceType" className="h-10 rounded-lg border border-input bg-background px-3">{[["document","文档"],["project","项目"],["code","代码"],["paper","论文"],["conversation","对话"],["user_statement","本人陈述"],["experiment","实验"],["other","其他"]].map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="grid gap-1 text-sm">来源标题<input name="title" required maxLength={200} className="h-10 rounded-lg border border-input bg-transparent px-3" /></label><label className="grid gap-1 text-sm">定位符（文件/章节/代码位置）<input name="locator" maxLength={1000} className="h-10 rounded-lg border border-input bg-transparent px-3" /></label><label className="grid gap-1 text-sm">核对状态<select name="verificationStatus" className="h-10 rounded-lg border border-input bg-background px-3"><option value="needs_review">待核对</option><option value="candidate">候选</option><option value="confirmed">已核对</option><option value="stale">需更新</option></select></label><Field label="短摘要" name="summary" /><Field label="适用范围 / 限制" name="scope" /></div>
        <button className="w-fit rounded-full border border-border px-4 py-2 text-sm">添加私人来源</button>
      </form>
    </section>
    <section className="grid gap-4 rounded-2xl border border-border p-5">
      <div><h2 className="text-xl font-semibold">主张与判断</h2><p className="mt-1 text-sm text-muted-foreground">本人自述、事实、判断、AI 推断和远景分开标记；没有来源时可以先留空。</p></div>
      {episode.claims.map((claim) => <article key={claim.id} className="grid gap-2 border-t border-border pt-3"><p className="text-xs text-muted-foreground">{claimTypeLabels[claim.claimType]} · {claimStatusLabels[claim.status]} · 提出者 {claim.proposedBy} · {claim.sourceIds.length ? `来源 ${claim.sourceIds.join(", ")}` : "无来源"}</p><p className="text-sm leading-6">{claim.content}</p><p className="text-xs text-muted-foreground">适用范围：{claim.scope || "未记录"} · {claim.checkedAt ? `最近核对 ${claim.checkedAt}（管理员会话）` : "尚未核对"}</p><form action={reviewPrivateClaimAction} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={episode.id} /><input type="hidden" name="claimId" value={claim.id} /><label className="text-xs">更新主张状态<select name="status" defaultValue={claim.status} className="ml-2 h-9 rounded-lg border border-input bg-background px-2">{Object.entries(claimStatusLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><button className="rounded-full border border-border px-3 py-1.5 text-xs">保存核对状态</button></form></article>)}
      <form action={addPrivateClaimAction} className="grid gap-3 border-t border-border pt-4"><input type="hidden" name="id" value={episode.id} /><h3 className="font-medium">添加主张</h3>
        <Field label="陈述" name="content" rows={3} />
        <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">主张类型<select name="claimType" className="h-10 rounded-lg border border-input bg-background px-3">{Object.entries(claimTypeLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="grid gap-1 text-sm">状态<select name="status" className="h-10 rounded-lg border border-input bg-background px-3">{Object.entries(claimStatusLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="grid gap-1 text-sm">提出者<select name="proposedBy" className="h-10 rounded-lg border border-input bg-background px-3"><option value="user">本人</option><option value="ai">AI（保持候选/待核对）</option><option value="imported_source">导入材料</option></select></label><label className="grid gap-1 text-sm">来源 ID（逗号分隔）<input name="sourceIds" placeholder={episode.sources.map((item) => item.id).join(", ")} className="h-10 rounded-lg border border-input bg-transparent px-3" /></label><Field label="适用范围" name="scope" /></div>
        <button className="w-fit rounded-full border border-border px-4 py-2 text-sm">添加私人主张</button>
      </form>
    </section>
    <section className="grid gap-4 rounded-2xl border border-border p-5">
      <div><h2 className="text-xl font-semibold">行动与反馈</h2><p className="mt-1 text-sm text-muted-foreground">记录谁做了什么、授权等级、预期与实际结果。添加记录不会替你执行任何外部行动。</p></div>
      {episode.actions.map((action) => <article key={action.id} className="grid gap-2 border-t border-border pt-3"><h3 className="font-medium">{action.description}</h3><p className="text-xs text-muted-foreground">{action.owner} · {action.authorizationLevel} · {action.status} · 来源 {action.sourceIds.join(", ") || "无"}</p>{action.expectedResult ? <p className="text-sm">预期：{action.expectedResult}</p> : null}<form action={updatePrivateActionResultAction} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="id" value={episode.id} /><input type="hidden" name="actionId" value={action.id} /><label className="grid gap-1 text-sm">状态<select name="status" defaultValue={action.status} className="h-10 rounded-lg border border-input bg-background px-3"><option value="planned">计划</option><option value="in_progress">进行中</option><option value="done">完成</option><option value="cancelled">取消</option></select></label><Field label="实际结果" name="actualResult" value={action.actualResult} /><Field label="行动反馈" name="feedback" value={action.feedback} /><button className="w-fit rounded-full border border-border px-3 py-1.5 text-xs">保存行动进展</button></form></article>)}
      <form action={addPrivateActionAction} className="grid gap-3 border-t border-border pt-4"><input type="hidden" name="id" value={episode.id} /><h3 className="font-medium">记录一个行动（仅记录，不执行）</h3><Field label="行动" name="description" rows={2} /><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">执行者<select name="owner" className="h-10 rounded-lg border border-input bg-background px-3"><option value="user">本人</option><option value="ai">AI</option><option value="collaborator">协作者</option></select></label><label className="grid gap-1 text-sm">授权等级<select name="authorizationLevel" className="h-10 rounded-lg border border-input bg-background px-3"><option value="L0">L0 理解</option><option value="L1">L1 草拟</option><option value="L2">L2 有限本地执行</option><option value="L3">L3 外部行动（仅记录授权，不会执行）</option></select></label><label className="grid gap-1 text-sm">行动状态<select name="status" className="h-10 rounded-lg border border-input bg-background px-3"><option value="planned">计划</option><option value="in_progress">进行中</option><option value="done">完成</option><option value="cancelled">取消</option></select></label><label className="grid gap-1 text-sm">日期<input type="date" name="date" className="h-10 rounded-lg border border-input bg-transparent px-3" /></label><Field label="预期结果" name="expectedResult" /><Field label="实际结果（可稍后补）" name="actualResult" /><Field label="关联来源 ID（逗号分隔）" name="sourceIds" /></div><button className="w-fit rounded-full border border-border px-4 py-2 text-sm">添加行动记录</button></form>
      {episode.feedback.map((item) => <article key={item.id} className="grid gap-1 border-t border-border pt-3"><p className="text-sm leading-6">{item.text}</p><p className="text-xs text-muted-foreground">{item.createdAt} · 来源 {item.sourceIds.join(", ") || "未关联"}</p></article>)}
      <form action={addPrivateFeedbackAction} className="grid gap-3 border-t border-border pt-4"><input type="hidden" name="id" value={episode.id} /><h3 className="font-medium">补充反馈或更新理解</h3><Field label="现实反馈、结果或后来修正" name="text" rows={3} /><Field label="关联来源 ID（逗号分隔）" name="sourceIds" /><button className="w-fit rounded-full border border-border px-4 py-2 text-sm">添加反馈</button></form>
    </section>
    <section className="grid gap-3 rounded-2xl border border-border p-5"><h2 className="text-xl font-semibold">最近版本记录</h2><p className="text-sm text-muted-foreground">旧版本作为私人快照保留；否定、归档和恢复不会静默删除先前内容。</p>{history.length ? history.map((item) => <article key={item.id} className="grid gap-1 border-t border-border pt-3 text-sm"><p>{item.change} · {item.changedAt}</p><p className="text-muted-foreground">{item.snapshot.title} · {item.snapshot.status}</p></article>) : <p className="text-sm text-muted-foreground">没有修改历史。</p>}</section>
  </main>;
}

function Field({ label, name, value = "", rows = 2 }: { label: string; name: string; value?: string; rows?: number }) {
  return <label className="grid gap-1 text-sm">{label}<textarea name={name} maxLength={10000} rows={rows} defaultValue={value} className="rounded-lg border border-input bg-transparent p-3 leading-6" /></label>;
}
