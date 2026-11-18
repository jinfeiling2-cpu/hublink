"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { analyzeResumeCoverage, resumeDraftContentSchema, statusLabel, type ResumeCandidateGroup } from "@/domain/resume-draft";
import type { ResumeDraft, ResumeDraftContent, ResumeRequirement } from "@/domain/resume-draft";

type SaveAction = (formData: FormData) => void | Promise<void>;
type Fit = "unset" | "high" | "medium" | "low";
const inputClass = "min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const fitLabels: Record<Fit, string> = { unset: "待本人判断", high: "高度相关", medium: "部分相关", low: "暂不相关" };

export function ResumeDraftEditor({ draft, groups, action, notice }: { draft: ResumeDraft; groups: ResumeCandidateGroup[]; action: SaveAction; notice?: string }) {
  const [title, setTitle] = useState(draft.title);
  const [targetRole, setTargetRole] = useState(draft.targetRole);
  const [content, setContent] = useState<ResumeDraftContent>(() => resumeDraftContentSchema.parse(draft.content));
  const entries = content.entries;
  const [error, setError] = useState("");

  const updateContent = (update: Partial<ResumeDraftContent>) => setContent((current) => ({ ...current, ...update }));
  const updateEntry = (index: number, update: Partial<(typeof entries)[number]>) => updateContent({ entries: entries.map((entry, i) => i === index ? { ...entry, ...update } : entry) });
  const coverage = analyzeResumeCoverage(content);
  const addEntry = (group: ResumeCandidateGroup) => {
    if (entries.some((entry) => entry.sourceNodeId === group.project.node.id)) return;
    updateContent({ entries: [...entries, {
      sourceNodeId: group.project.node.id, kind: group.project.node.type as "project" | "experience",
      title: group.project.node.title, role: "待本人核对", summary: group.project.node.summary,
      timeStart: group.project.node.timeStart, timeEnd: group.project.node.timeEnd,
      sourceRefs: [group.project.node.id], targetFit: "unset", contributions: [], selectionReason: "", requirementRefs: [],
    }] });
  };
  const toggleContribution = (entryIndex: number, group: ResumeCandidateGroup, nodeId: string, checked: boolean) => {
    const candidate = group.contributions.find((item) => item.node.id === nodeId);
    if (!candidate) return;
    const entry = entries[entryIndex];
    const contributions = checked
      ? [...entry.contributions, { sourceNodeId: nodeId, text: "候选表述待编辑：请写明本人实际行动、角色与证据。", sourceRefs: [nodeId], reviewStatus: candidate.node.contributionReview ?? "owner_unconfirmed" as const, targetFit: "unset" as const, selectionReason: "", requirementRefs: [], variant: "engineering" as const }]
      : entry.contributions.filter((item) => item.sourceNodeId !== nodeId);
    updateEntry(entryIndex, { contributions });
  };
  const setContribution = (entryIndex: number, contributionIndex: number, update: Partial<(typeof entries)[number]["contributions"][number]>) => {
    const entry = entries[entryIndex];
    updateEntry(entryIndex, { contributions: entry.contributions.map((item, i) => i === contributionIndex ? { ...item, ...update } : item) });
  };
  const moveEntry = (index: number, direction: -1 | 1) => updateContent({ entries: (() => {
    const current = entries;
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  })() });
  const toggleRequirementRef = (refs: string[], id: string, checked: boolean) => checked ? [...refs, id] : refs.filter((value) => value !== id);
  const updateRequirement = (id: string, update: Partial<ResumeRequirement>) => updateContent({ requirements: content.requirements.map((item) => item.id === id ? { ...item, ...update } : item) });
  const addRequirement = () => updateContent({ requirements: [...content.requirements, { id: crypto.randomUUID(), kind: "required_skill", text: "", evidenceExpectation: "", origin: content.target.kind === "job_description" ? "job_description" : "general_direction" }] });
  const factField = (label: string, key: "name" | "contact" | "positioning" | "researchInterests") => {
    const fact = content.sections[key];
    const updateFact = (update: Partial<typeof fact>) => updateContent({ sections: { ...content.sections, [key]: { ...fact, ...update } } });
    return <div className="grid gap-2 text-sm" key={key}><label>{label}<textarea className={inputClass} rows={key === "positioning" ? 3 : 2} value={fact.text} onChange={(event) => updateFact({ text: event.target.value })} /></label><label>来源引用<input className={inputClass} value={fact.sourceRefs.join(", ")} onChange={(event) => updateFact({ sourceRefs: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} /></label><label>核对状态<select className={inputClass} value={fact.reviewStatus} onChange={(event) => updateFact({ reviewStatus: event.target.value as typeof fact.reviewStatus })}><option value="needs_review">待核对</option><option value="candidate">候选</option><option value="owner_confirmed">本人确认</option><option value="rejected">已否定</option></select></label></div>;
  };
  const factList = (label: string, key: "education" | "publications" | "skills" | "otherExperience") => <div className="grid gap-2 text-sm" key={key}><div className="flex items-center justify-between"><span>{label}</span><button type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => updateContent({ sections: { ...content.sections, [key]: [...content.sections[key], { text: "", sourceRefs: [], reviewStatus: "needs_review" }] } })}>添加</button></div>{content.sections[key].map((fact, index) => <div key={`${key}-${index}`} className="grid gap-2 rounded-lg bg-muted/40 p-3"><textarea className={inputClass} rows={2} value={fact.text} onChange={(event) => updateContent({ sections: { ...content.sections, [key]: content.sections[key].map((item, i) => i === index ? { ...item, text: event.target.value } : item) } })} /><input className={inputClass} aria-label={`${label}来源引用`} placeholder="来源引用，逗号分隔" value={fact.sourceRefs.join(", ")} onChange={(event) => updateContent({ sections: { ...content.sections, [key]: content.sections[key].map((item, i) => i === index ? { ...item, sourceRefs: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } : item) } })} /><div className="flex gap-2"><select className={inputClass} aria-label={`${label}核对状态`} value={fact.reviewStatus} onChange={(event) => updateContent({ sections: { ...content.sections, [key]: content.sections[key].map((item, i) => i === index ? { ...item, reviewStatus: event.target.value as typeof fact.reviewStatus } : item) } })}><option value="needs_review">待核对</option><option value="candidate">候选</option><option value="owner_confirmed">本人确认</option><option value="rejected">已否定</option></select><button type="button" className="rounded border border-border px-3" onClick={() => updateContent({ sections: { ...content.sections, [key]: content.sections[key].filter((_, i) => i !== index) } })}>移除</button></div></div>)}</div>;
  const save = (event: FormEvent<HTMLFormElement>) => {
    if (!title.trim() || !targetRole.trim()) { event.preventDefault(); setError("标题和目标读者不能为空。"); return; }
    setError("");
  };

  return <div className="grid gap-6">
    <form action={action} onSubmit={save} className="grid gap-6">
      <input type="hidden" name="id" value={draft.id} />
      <input type="hidden" name="contentJson" value={JSON.stringify(content)} />
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm">私人简历标题<input className={inputClass} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} name="title" /></label>
        <label className="grid gap-1.5 text-sm">目标岗位 / 读者<input className={inputClass} maxLength={240} value={targetRole} onChange={(event) => setTargetRole(event.target.value)} name="targetRole" /></label>
        <label className="grid gap-1.5 text-sm">岗位资料类型<select className={inputClass} value={content.target.kind} onChange={(event) => updateContent({ target: { ...content.target, kind: event.target.value as "general" | "job_description" } })}><option value="general">通用方向草稿</option><option value="job_description">具体 JD 草稿</option></select></label>
        {content.target.kind === "general" ? <label className="grid gap-1.5 text-sm">通用方向标签<input className={inputClass} maxLength={300} value={content.target.generalLabel} onChange={(event) => updateContent({ target: { ...content.target, generalLabel: event.target.value } })} /></label> : null}
        <label className="grid gap-1.5 text-sm">公司（可留空）<input className={inputClass} maxLength={200} value={content.target.company} onChange={(event) => updateContent({ target: { ...content.target, company: event.target.value } })} /></label>
        <label className="grid gap-1.5 text-sm md:col-span-2">岗位描述 / 合成测试 JD<textarea className={inputClass} rows={5} maxLength={20000} value={content.target.jobDescription} onChange={(event) => updateContent({ target: { ...content.target, jobDescription: event.target.value } })} placeholder="没有真实 JD 时，可写清楚这是通用方向或合成测试材料。" /></label>
        <label className="grid gap-1.5 text-sm">领域<input className={inputClass} value={content.target.domain} onChange={(event) => updateContent({ target: { ...content.target, domain: event.target.value } })} /></label>
        <label className="grid gap-1.5 text-sm">资历 / 地点 / 语言<input className={inputClass} value={[content.target.seniority, content.target.location, content.target.language].filter(Boolean).join(" | ")} onChange={(event) => { const [seniority = "", location = "", language = ""] = event.target.value.split("|").map((part) => part.trim()); updateContent({ target: { ...content.target, seniority, location, language } }); }} placeholder="实习 | 香港 | 中文/英文" /></label>
      </section>

      <section className="grid gap-3 rounded-xl border border-border p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">岗位要求拆解</h2><p className="text-sm text-muted-foreground">人工编辑并映射到项目或贡献；覆盖只表示已建立映射，不代表通过招聘筛选。</p></div><button type="button" onClick={addRequirement} className="rounded-full border border-border px-3 py-1.5 text-sm">添加要求</button></div>
        {content.requirements.map((requirement) => <div key={requirement.id} className="grid gap-2 rounded-lg bg-muted/40 p-3 md:grid-cols-[1fr_1fr_auto]"><input className={inputClass} value={requirement.text} placeholder="职责、技能、领域经验或证据期待" onChange={(event) => updateRequirement(requirement.id, { text: event.target.value })} /><div className="grid gap-2 sm:grid-cols-2"><select className={inputClass} value={requirement.kind} onChange={(event) => updateRequirement(requirement.id, { kind: event.target.value as ResumeRequirement["kind"] })}>{[["responsibility","核心职责"],["required_skill","必需能力"],["preferred_skill","优先能力"],["domain_experience","领域经验"],["evidence_expectation","证据期待"],["inferred","推断要求"]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><select className={inputClass} value={requirement.origin} onChange={(event) => updateRequirement(requirement.id, { origin: event.target.value as ResumeRequirement["origin"] })}><option value="job_description">来自岗位描述</option><option value="owner_inference">本人推断</option><option value="general_direction">通用方向</option></select><input className={`${inputClass} sm:col-span-2`} value={requirement.evidenceExpectation} placeholder="招聘者希望看到什么证据" onChange={(event) => updateRequirement(requirement.id, { evidenceExpectation: event.target.value })} /></div><button type="button" aria-label="移除要求" onClick={() => updateContent({ requirements: content.requirements.filter((item) => item.id !== requirement.id) })} className="rounded border border-border px-3 py-1 text-sm">移除</button></div>)}
        {coverage.length ? <ul className="grid gap-1 text-sm">{coverage.map(({ requirement, covered, inferred }) => <li key={requirement.id} className={covered ? "text-emerald-800" : "text-amber-800"}>{covered ? "已映射" : "尚无证据映射"} · {inferred ? "推断" : "岗位材料"} · {requirement.text || "（要求待填写）"}</li>)}</ul> : <p className="text-sm text-muted-foreground">尚未拆解要求。</p>}
      </section>

      <section className="grid gap-4 rounded-xl border border-border p-5"><div><h2 className="text-xl font-semibold">完整简历栏目草稿</h2><p className="text-sm text-muted-foreground">栏目内容、来源引用与核对状态保存在本稿，不回写原始节点；新内容默认待核对。</p></div><div className="grid gap-3 md:grid-cols-2">{factField("姓名", "name")}{factField("联系方式", "contact")}{factField("个人定位", "positioning")}{factField("研究兴趣", "researchInterests")}{factList("教育背景", "education")}{factList("论文与发表", "publications")}{factList("技能", "skills")}{factList("其他经历", "otherExperience")}</div></section>

      {notice === "saved" ? <p role="status" className="rounded-lg border border-emerald-700/30 bg-emerald-50 p-3 text-sm text-emerald-900">草稿与排序已保存。</p> : null}
      {notice === "invalid-selection" ? <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">选中的项目、经历或贡献已不存在，或贡献没有关联到所选项目。请检查选择后保存。</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      <section className="grid gap-3"><div><h2 className="text-xl font-semibold">选择项目与经历</h2><p className="text-sm leading-6 text-muted-foreground">结构完整性、个人归属核对和目标相关性分开显示。相关性由你手动判断；字段齐全不代表项目质量或岗位匹配。</p></div>
        {groups.map((group) => {
          const selected = entries.some((entry) => entry.sourceNodeId === group.project.node.id);
          return <article key={group.project.node.id} className="grid gap-3 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-semibold">{group.project.node.title}</h3><p className="text-sm leading-6 text-muted-foreground">{group.project.node.summary || "尚无简介"}</p><p className="mt-1 text-xs text-muted-foreground">{group.project.node.type === "experience" ? "经历" : "项目"} · {group.project.node.visibility === "personal" ? "个人" : "公开"} · 结构缺项：{group.project.missing.length || "无"}</p></div>
              <button type="button" onClick={() => selected ? updateContent({ entries: entries.filter((entry) => entry.sourceNodeId !== group.project.node.id) }) : addEntry(group)} className="rounded-full border border-border px-3 py-1.5 text-sm">{selected ? "移除此项目" : "加入草稿"}</button>
            </div>
            <details className="rounded-lg bg-muted/40 p-3 text-sm"><summary className="cursor-pointer">查看项目事实、证据与缺项</summary><p className="mt-2 whitespace-pre-wrap leading-6">{group.project.node.body || "没有更多说明。"}</p>{group.project.evidence.length ? <p className="mt-2 text-xs">证据出口：{group.project.evidence.join("；")}</p> : null}{group.project.missing.length ? <p className="mt-2 text-xs text-amber-800">待补：{group.project.missing.join("；")}</p> : null}</details>
            {group.contributions.length ? <div className="grid gap-2 border-l-2 border-emerald-800/20 pl-3"><p className="text-xs font-semibold">可选个人贡献（可包含 personal 节点）</p>{group.contributions.map((contribution) => <label key={contribution.node.id} className="grid gap-2 rounded-lg bg-muted/40 p-3 text-sm">
              <span className="flex items-start gap-2"><input type="checkbox" checked={selected && Boolean(entries.find((entry) => entry.sourceNodeId === group.project.node.id)?.contributions.some((item) => item.sourceNodeId === contribution.node.id))} disabled={!selected} onChange={(event) => toggleContribution(entries.findIndex((entry) => entry.sourceNodeId === group.project.node.id), group, contribution.node.id, event.target.checked)} /><span><strong>{contribution.node.title}</strong><span className="ml-2 text-xs text-amber-800">{statusLabel(contribution.node.contributionReview)}</span><span className="ml-2 text-xs text-muted-foreground">{contribution.node.visibility === "personal" ? "个人" : "公开"}</span></span></span>
              <span className="pl-6 text-xs leading-5 text-muted-foreground">系统事实：{contribution.node.summary || "尚无简介"}{contribution.missing.length ? ` · 缺项：${contribution.missing.join("；")}` : ""}</span>
              <details className="ml-6 text-xs"><summary className="cursor-pointer">查看事实记录与证据说明</summary><span className="mt-1 block whitespace-pre-wrap leading-5">{contribution.node.body || "未记录。"}</span>{contribution.evidence.length ? <span className="mt-1 block">证据出口：{contribution.evidence.join("；")}</span> : null}</details>
            </label>)}</div> : null}
          </article>;
        })}
      </section>

      <section className="grid gap-4"><h2 className="text-xl font-semibold">简历条目与排序</h2>{entries.length ? entries.map((entry, index) => {
        const group = groups.find((item) => item.project.node.id === entry.sourceNodeId);
        return <article key={entry.sourceNodeId} className="grid gap-4 rounded-xl border border-border p-4">
          <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">项目顺序 {index + 1} · 原始来源 {entry.sourceNodeId}</p><h3 className="text-lg font-semibold">{entry.title}</h3></div><div className="flex gap-2"><button type="button" disabled={index === 0} onClick={() => moveEntry(index, -1)} className="rounded border border-border px-2 py-1 text-sm">上移</button><button type="button" disabled={index === entries.length - 1} onClick={() => moveEntry(index, 1)} className="rounded border border-border px-2 py-1 text-sm">下移</button><button type="button" onClick={() => updateContent({ entries: entries.filter((_, i) => i !== index) })} className="rounded border border-border px-2 py-1 text-sm">移除</button></div></header>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">简历专用项目标题<input className={inputClass} value={entry.title} onChange={(event) => updateEntry(index, { title: event.target.value })} /></label>
            <label className="grid gap-1 text-sm">简历专用角色<input className={inputClass} value={entry.role} onChange={(event) => updateEntry(index, { role: event.target.value })} /></label>
            <label className="grid gap-1 text-sm md:col-span-2">项目背景 / 简介<textarea className={inputClass} rows={3} value={entry.summary} onChange={(event) => updateEntry(index, { summary: event.target.value })} /></label>
            <label className="grid gap-1 text-sm">开始时间<input className={inputClass} value={entry.timeStart ?? ""} onChange={(event) => updateEntry(index, { timeStart: event.target.value || null })} /></label>
            <label className="grid gap-1 text-sm">结束时间<input className={inputClass} value={entry.timeEnd ?? ""} onChange={(event) => updateEntry(index, { timeEnd: event.target.value || null })} /></label>
            <label className="grid gap-1 text-sm">目标相关性<select className={inputClass} value={entry.targetFit} onChange={(event) => updateEntry(index, { targetFit: event.target.value as Fit })}>{Object.entries(fitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="grid gap-1 text-sm">私人来源引用（逗号分隔）<input className={inputClass} value={entry.sourceRefs.join(", ")} onChange={(event) => updateEntry(index, { sourceRefs: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
            <label className="grid gap-1 text-sm md:col-span-2">纳入理由<input className={inputClass} value={entry.selectionReason} onChange={(event) => updateEntry(index, { selectionReason: event.target.value })} /></label>
            <div className="grid gap-1 text-sm md:col-span-2"><span>覆盖的岗位要求</span>{content.requirements.map((requirement) => <label key={requirement.id} className="flex items-center gap-2"><input type="checkbox" checked={entry.requirementRefs.includes(requirement.id)} onChange={(event) => updateEntry(index, { requirementRefs: toggleRequirementRef(entry.requirementRefs, requirement.id, event.target.checked) })} />{requirement.text || "（要求待填写）"}</label>)}</div>
          </div>
          {entry.contributions.length ? <div className="grid gap-3 rounded-lg bg-muted/30 p-3"><h4 className="font-medium">所选贡献与简历文案</h4>{entry.contributions.map((item, contributionIndex) => {
            const node = group?.contributions.find((candidate) => candidate.node.id === item.sourceNodeId)?.node;
            return <div key={item.sourceNodeId} className="grid gap-2 border-t border-border pt-3">
              <p className="text-sm font-medium">{node?.title ?? item.sourceNodeId} <span className="ml-2 text-xs text-amber-800">{statusLabel(item.reviewStatus)}</span></p>
              <textarea className={inputClass} rows={3} value={item.text} onChange={(event) => setContribution(index, contributionIndex, { text: event.target.value })} />
              <label className="grid gap-1 text-sm">选择理由<input className={inputClass} value={item.selectionReason} onChange={(event) => setContribution(index, contributionIndex, { selectionReason: event.target.value })} /></label>
              <div className="grid gap-1 text-sm"><span>关联岗位要求</span>{content.requirements.map((requirement) => <label key={requirement.id} className="flex items-center gap-2"><input type="checkbox" checked={item.requirementRefs.includes(requirement.id)} onChange={(event) => setContribution(index, contributionIndex, { requirementRefs: toggleRequirementRef(item.requirementRefs, requirement.id, event.target.checked) })} />{requirement.text || "（要求待填写）"}</label>)}</div>
              <div className="grid gap-3 md:grid-cols-3"><label className="grid gap-1 text-sm">目标相关性<select className={inputClass} value={item.targetFit} onChange={(event) => setContribution(index, contributionIndex, { targetFit: event.target.value as Fit })}>{Object.entries(fitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="grid gap-1 text-sm">Bullet 方向<select className={inputClass} value={item.variant} onChange={(event) => setContribution(index, contributionIndex, { variant: event.target.value as typeof item.variant })}><option value="technical">技术细节</option><option value="results">结果导向</option><option value="research">研究导向</option><option value="engineering">工程导向</option></select></label><label className="grid gap-1 text-sm">私人来源引用（逗号分隔）<input className={inputClass} value={item.sourceRefs.join(", ")} onChange={(event) => setContribution(index, contributionIndex, { sourceRefs: event.target.value.split(",").map((ref) => ref.trim()).filter(Boolean) })} /></label></div>
              <div className="flex gap-2"><button type="button" disabled={contributionIndex === 0} onClick={() => { const next = [...entry.contributions]; [next[contributionIndex - 1], next[contributionIndex]] = [next[contributionIndex], next[contributionIndex - 1]]; updateEntry(index, { contributions: next }); }} className="rounded border border-border px-2 py-1 text-xs">贡献上移</button><button type="button" disabled={contributionIndex === entry.contributions.length - 1} onClick={() => { const next = [...entry.contributions]; [next[contributionIndex + 1], next[contributionIndex]] = [next[contributionIndex], next[contributionIndex + 1]]; updateEntry(index, { contributions: next }); }} className="rounded border border-border px-2 py-1 text-xs">贡献下移</button></div>
            </div>;
          })}</div> : <p className="text-sm text-muted-foreground">尚未选择贡献。可先保存项目摘要，再勾选上方的独立贡献。</p>}
        </article>;
      }) : <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">尚未选择项目或经历。</p>}</section>

      <label className="grid gap-1.5 text-sm">暂不纳入的项目与理由<textarea className={inputClass} rows={3} value={content.omittedProjectNotes} onChange={(event) => updateContent({ omittedProjectNotes: event.target.value })} placeholder="记录为何暂不纳入；无需把无关项目硬塞进这份简历。" /></label>

      <div className="flex flex-wrap items-center gap-3"><button className="rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground">保存私人草稿</button><Link className="rounded-full border border-border px-5 py-2.5 text-sm" href={`/admin/resume/drafts/${draft.id}/preview`}>打开私人简历预览 →</Link><span className="text-xs text-muted-foreground">更新于 {new Date(draft.updatedAt).toLocaleString("zh-HK")}</span></div>
    </form>
  </div>;
}
