import { redirect } from "next/navigation";
import Link from "next/link";
import { readPrivateMainline, readPrivateMainlineReviewHistory, readPrivateTaskCheck } from "@/domain/private-mainline";
import { isAdmin } from "@/lib/session";
import { checkPrivateMainlineTaskAction, savePrivateMainlineRelationshipReviewAction, savePrivateMainlineReviewAction } from "../../actions";

export const dynamic = "force-dynamic";

const stateLabels = {
  document_fact: "文档明确表述",
  owner_view: "本人明确观点（待核原句归属）",
  current_task: "当前研究任务",
  long_term_agenda: "长期议程",
  ai_interpretation: "AI 候选解释",
  hypothesis: "待验证假设",
  speculative_vision: "推测性远景",
  open_question: "开放问题",
};

const reviewLabels = {
  candidate: "候选，未确认",
  accepted: "本人接受当前表述",
  rejected: "本人否定此主线",
  revise: "需要改写后再审",
};

const relationshipLabels = {
  expresses: "体现",
  supports: "支持",
  contradicts: "冲突 / 反例",
  motivated: "促成",
  method_transfer: "方法迁移",
  structural_analogy: "结构类比 · 不代表因果",
  evolved_from: "演变自",
  supersedes: "取代旧观点",
  co_emerged: "共同形成",
  related_to: "一般关联",
};

const relationshipStatusLabels = { candidate: "候选关系，未确认", owner_confirmed: "本人确认", rejected: "本人否定", superseded: "已被后续关系取代" };
const proposerLabels = { user: "本人提出", ai: "AI 候选", imported_source: "来源材料提出" };

export default async function PrivateMainlinePage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const [mainline, taskCheck, history, query] = [readPrivateMainline(), readPrivateTaskCheck(), readPrivateMainlineReviewHistory(), await searchParams] as const;

  if (!mainline) return <main className="mx-auto grid max-w-5xl gap-4 px-4 py-8">
    <h1 className="text-3xl font-semibold">私人主线</h1>
    <p className="text-sm leading-6 text-muted-foreground">本机尚未配置私人主线档案。个人资料需要单独放入 Git 忽略的数据目录。</p>
  </main>;

  return <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8">
    <header className="grid gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Private interpretation prototype</p>
      <h1 className="text-3xl font-semibold tracking-tight">{mainline.title}</h1>
      <p className="max-w-3xl text-sm leading-7 text-muted-foreground">真实材料阅读原型。所有内容只从被忽略的本地私人文件读取，服务端检查管理员后才读取；保存的修改写到另一份本地私人 review 文件。它不改变图谱、论文承诺或公开简历。</p>
      <p className="w-fit rounded-full border border-amber-500/40 bg-amber-50 px-3 py-1.5 text-sm text-amber-950">当前核对状态：{reviewLabels[mainline.reviewStatus]}</p>
      {query.notice === "saved" ? <p role="status" className="text-sm text-emerald-800">私人主线核对已保存。</p> : null}
      {query.notice === "invalid" ? <p role="alert" className="text-sm text-destructive">输入无效，未保存；请检查长度和核对选项。</p> : null}
      {query.notice === "invalid-task" ? <p role="alert" className="text-sm text-destructive">任务为空或过长，未检查。</p> : null}
      {query.notice === "relationship-saved" ? <p role="status" className="text-sm text-emerald-800">关系核对已保存，原始主线与来源关系档案保持独立。</p> : null}
      {query.notice === "invalid-relationship" ? <p role="alert" className="text-sm text-destructive">关系核对无效或来源已变化，未保存。</p> : null}
    </header>

    <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
      <div><p className="text-xs font-semibold tracking-wide text-muted-foreground">可编辑 / 可否定</p><h2 className="mt-1 text-xl font-semibold">主线候选</h2></div>
      <form action={savePrivateMainlineReviewAction} className="grid gap-4">
        <label className="grid gap-2 text-sm">候选表述<textarea name="candidateCore" required maxLength={3000} rows={4} defaultValue={mainline.candidateCore} className="rounded-lg border border-input bg-background p-3 leading-6" /></label>
        <label className="grid gap-2 text-sm">本人核对状态<select name="reviewStatus" defaultValue={mainline.reviewStatus} className="h-10 rounded-lg border border-input bg-background px-3">{Object.entries(reviewLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-2 text-sm">核对说明 / 反例 / 冲突<textarea name="ownerNote" maxLength={3000} rows={3} defaultValue={mainline.ownerNote} className="rounded-lg border border-input bg-background p-3 leading-6" /></label>
        <button className="w-fit rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">保存私人核对</button>
      </form>
      <p className="text-xs leading-5 text-muted-foreground">保存为“接受”只表示你接受当前措辞，不会写入公开资料，也不会覆盖研究目标；选择“否定”会保留材料和反例供以后理解，不把它继续当作稳定身份。</p>
    </section>

    <section className="grid gap-4">
      <div><p className="text-xs font-semibold tracking-wide text-muted-foreground">从真实案例读方法</p><h2 className="mt-1 text-xl font-semibold">可能的思维方法分支</h2></div>
      <ol className="grid gap-3 md:grid-cols-3">{mainline.thinkingMethod.map((item, index) => <li key={item.text} className="grid content-start gap-3 rounded-xl border border-border p-4">
        <p className="text-xs text-muted-foreground">步骤 {index + 1} · {stateLabels[item.state]}</p><p className="text-sm leading-6">{item.text}</p><Evidence sources={item.sources} boundary={item.boundary} />
      </li>)}</ol>
    </section>

    <section className="grid gap-4">
      <div><p className="text-xs font-semibold tracking-wide text-muted-foreground">跨项目解释需要有理由</p><h2 className="mt-1 text-xl font-semibold">关系、证据与边界</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">关系不是连线装饰：每条都说明相关机制、来源和不能推出的结论。这里允许文档事实、分析解释和长期议程并存。</p></div>
      <div className="grid gap-3">{mainline.relationships.map((item) => <article key={item.title} className="grid gap-3 rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{item.title}</h3><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{relationshipLabels[item.kind]} · {stateLabels[item.state]}</span></div>
        <p className="text-xs text-muted-foreground">{proposerLabels[item.proposedBy]} · {relationshipStatusLabels[item.status]} · private</p>
        <p className="text-sm leading-7">{item.explanation}</p>
        {item.validWithin ? <p className="text-xs leading-5 text-muted-foreground"><strong>适用范围：</strong>{item.validWithin}</p> : null}
        {item.counterEvidence.length ? <List title="反证 / 冲突材料" items={item.counterEvidence} /> : <p className="text-xs text-amber-800">尚未记录反例；这不表示不存在反例。</p>}
        <Evidence sources={item.sources} boundary={item.caveat} />
        <form action={savePrivateMainlineRelationshipReviewAction} className="grid gap-3 border-t border-border pt-3">
          <input type="hidden" name="title" value={item.title} />
          <label className="grid gap-1 text-sm">本人对这条关系的判断<select name="status" defaultValue={item.status} className="h-10 rounded-lg border border-input bg-background px-3"><option value="candidate">保留候选，待确认</option><option value="owner_confirmed">本人确认此关系（仅此关系）</option><option value="rejected">本人否定此关系</option><option value="superseded">被新解释取代</option></select></label>
          <label className="grid gap-1 text-sm">关系解释改写（留空沿用候选文本）<textarea name="explanationOverride" defaultValue={item.explanationOverride} maxLength={3000} rows={3} className="rounded-lg border border-input bg-background p-3" /></label>
          <label className="grid gap-1 text-sm">核对理由 / 反例<textarea name="ownerNote" defaultValue={item.ownerNote} maxLength={2000} rows={2} className="rounded-lg border border-input bg-background p-3" /></label>
          <button className="w-fit rounded-full border border-border px-4 py-2 text-sm">保存此关系核对</button>
          {item.reviewHistory.length ? <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">查看此关系的 {item.reviewHistory.length} 条修订</summary>{[...item.reviewHistory].reverse().map((entry, index) => <p key={`${entry.changedAt}-${index}`} className="mt-2">{entry.changedAt} · {relationshipStatusLabels[entry.status]}{entry.ownerNote ? ` · ${entry.ownerNote}` : ""}</p>)}</details> : null}
        </form>
      </article>)}</div>
    </section>

    <section className="grid gap-4">
      <div><p className="text-xs font-semibold tracking-wide text-muted-foreground">并存解释，不强行归一</p><h2 className="mt-1 text-xl font-semibold">竞争性主线与局部解释</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">候选主线之外的解释可以并存、被否定或过期；当前没有主人确认的稳定身份结论。</p></div>
      {mainline.competingHypotheses.length ? mainline.competingHypotheses.map((item) => <article key={item.title} className="grid gap-3 rounded-xl border border-border p-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{item.title}</h3><span className="text-xs">{stateLabels[item.state]} · {relationshipStatusLabels[item.status]} · private</span></div><p className="text-sm leading-7">{item.explanation}</p>{item.counterEvidence.length ? <List title="可能反证或限制" items={item.counterEvidence} /> : <p className="text-xs text-amber-800">尚未关联反证或冲突材料。</p>}<Evidence sources={item.sources} boundary={item.boundary} /></article>) : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">当前没有配置竞争解释；可在后续私人档案中补充，不应为了完整而虚构。</p>}
    </section>

    <section className="grid gap-4">
      <div><p className="text-xs font-semibold tracking-wide text-muted-foreground">同一事实底座，三种阅读任务</p><h2 className="mt-1 text-xl font-semibold">读者输出样例</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">这是人工配置的阅读策略，不是自动读者推理。每份都展示选择原因、省略项、泄露边界和待核问题。</p></div>
      <div className="grid gap-4">{mainline.readers.map((reader) => <article key={reader.id} className="grid gap-4 rounded-2xl border border-border p-5">
        <div><h3 className="text-lg font-semibold">{reader.title}</h3><p className="mt-1 text-sm text-muted-foreground">{reader.purpose}</p></div>
        <p className="border-l-2 border-primary pl-4 text-sm leading-7">{reader.text}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <List title="来源映射" items={reader.sources} />
          <List title="为什么选择" items={reader.selected} />
          <List title="为什么省略" items={reader.omitted} />
          <List title="证据与隐私边界" items={reader.leakageGuard} />
          <List title="需要重新确认" items={reader.unknowns} />
        </div>
      </article>)}</div>
    </section>

    <section className="grid gap-3 rounded-2xl border border-border p-5">
      <h2 className="text-xl font-semibold">对齐材料的潜在接口</h2><p className="text-sm leading-6 text-muted-foreground">主文档说明了这些材料的预期职责；原型与正式对齐资料不是同一对象。</p>
      {mainline.alignmentArtifacts.map((item) => <article key={item.text} className="grid gap-2 border-t border-border pt-3"><p className="text-sm leading-6">{item.text}</p><Evidence sources={item.sources} boundary={item.boundary} /></article>)}
    </section>

    <section className="grid gap-3 rounded-2xl border border-border p-5"><h2 className="text-xl font-semibold">主线核对历史</h2><p className="text-sm text-muted-foreground">每次保存前的主线措辞、状态和核对说明保存在本地私人历史里。</p>{history.length ? [...history].reverse().map((item) => <article key={item.changedAt} className="grid gap-1 border-t border-border pt-3 text-sm"><p>{item.changedAt} · {reviewLabels[item.reviewStatus]}</p><p className="leading-6">{item.candidateCore}</p>{item.ownerNote ? <p className="text-xs text-muted-foreground">核对说明：{item.ownerNote}</p> : null}</article>) : <p className="text-sm text-muted-foreground">还没有历史修订；首次保存会建立当前核对记录，后续保存会保留前版。</p>}</section>

    <section className="grid gap-3 rounded-2xl border border-amber-500/30 bg-amber-50/50 p-5">
      <h2 className="text-xl font-semibold">未确认、冲突与反例入口</h2>
      <p className="text-sm leading-6">若新任务和当前 Paper 1、博士完成性或本人授权边界冲突，先提出冲突和可选解释，等待本人决定；不自动覆盖既有目标。当前原型只把冲突规则呈现出来，尚不自动监控新任务。</p>
      <form action={checkPrivateMainlineTaskAction} className="grid gap-3 rounded-xl border border-amber-900/10 bg-background p-4">
        <label className="grid gap-2 text-sm">试查一个新任务<textarea name="task" required maxLength={2000} rows={3} placeholder="输入一个待对齐的新任务" className="rounded-lg border border-input bg-background p-3 leading-6" /></label>
        <button className="w-fit rounded-full border border-amber-900/20 px-4 py-2 text-sm">对照已记录边界</button>
        <p className="text-xs leading-5 text-muted-foreground">这是明确关键词规则，不是自动理解引擎。未触发警告不代表已对齐；仍需本人判断任务是否改变现实条件、优先级或授权。</p>
        {query.notice === "task-checked" && taskCheck ? <div role="status" className="grid gap-2 border-t border-border pt-3 text-sm"><p>检查结果（{new Date(taskCheck.checkedAt).toLocaleString("zh-HK")}）：{taskCheck.task}</p>{taskCheck.warnings.length ? <ul className="grid gap-1 text-amber-900">{taskCheck.warnings.map((warning) => <li key={warning}>需要重新对齐：{warning}</li>)}</ul> : <p>没有触发已编码的边界规则；这不构成自动批准。</p>}</div> : null}
      </form>
      <div className="grid gap-3">{mainline.unresolved.map((item) => <article key={item.text} className="rounded-lg border border-amber-900/10 bg-background p-4"><p className="text-sm leading-6">{item.text}</p><Evidence sources={item.sources} boundary={item.boundary} /></article>)}</div>
    </section>
  </main>;
}

function Evidence({ sources, boundary }: { sources: string[]; boundary: string }) {
  return <details className="border-t border-border pt-2 text-xs leading-5 text-muted-foreground"><summary className="cursor-pointer">来源与边界</summary><div className="mt-2 grid gap-1"><p><strong>来源：</strong>{sources.map((source, index) => {
    const route = source.match(/^(\/admin\/[^（ ]+)/)?.[1];
    return <span key={`${source}-${index}`}>{index ? "；" : ""}{route ? <><Link className="underline underline-offset-2" href={route}>{route}</Link>{source.slice(route.length)}</> : source}</span>;
  })}</p><p><strong>边界：</strong>{boundary}</p></div></details>;
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div className="grid content-start gap-2"><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4><ul className="grid gap-1.5">{items.map((item) => <li key={item} className="text-xs leading-5 text-muted-foreground">· {item}</li>)}</ul></div>;
}
