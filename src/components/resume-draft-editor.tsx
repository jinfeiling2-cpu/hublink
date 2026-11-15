"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { statusLabel, type ResumeCandidateGroup } from "@/domain/resume-draft";
import type { ResumeDraft, ResumeDraftContent } from "@/domain/resume-draft";

type SaveAction = (formData: FormData) => void | Promise<void>;
type Fit = "unset" | "high" | "medium" | "low";
const inputClass = "min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const fitLabels: Record<Fit, string> = { unset: "待本人判断", high: "高度相关", medium: "部分相关", low: "暂不相关" };

export function ResumeDraftEditor({ draft, groups, action, notice }: { draft: ResumeDraft; groups: ResumeCandidateGroup[]; action: SaveAction; notice?: string }) {
  const [title, setTitle] = useState(draft.title);
  const [targetRole, setTargetRole] = useState(draft.targetRole);
  const [entries, setEntries] = useState<ResumeDraftContent["entries"]>(draft.content.entries);
  const [error, setError] = useState("");

  const updateEntry = (index: number, update: Partial<(typeof entries)[number]>) => setEntries((current) => current.map((entry, i) => i === index ? { ...entry, ...update } : entry));
  const addEntry = (group: ResumeCandidateGroup) => {
    if (entries.some((entry) => entry.sourceNodeId === group.project.node.id)) return;
    setEntries((current) => [...current, {
      sourceNodeId: group.project.node.id, kind: group.project.node.type as "project" | "experience",
      title: group.project.node.title, role: "待本人核对", summary: group.project.node.summary,
      timeStart: group.project.node.timeStart, timeEnd: group.project.node.timeEnd,
      sourceRefs: [group.project.node.id], targetFit: "unset", contributions: [],
    }]);
  };
  const toggleContribution = (entryIndex: number, group: ResumeCandidateGroup, nodeId: string, checked: boolean) => {
    const candidate = group.contributions.find((item) => item.node.id === nodeId);
    if (!candidate) return;
    const entry = entries[entryIndex];
    const contributions = checked
      ? [...entry.contributions, { sourceNodeId: nodeId, text: "候选表述待编辑：请写明本人实际行动、角色与证据。", sourceRefs: [nodeId], reviewStatus: candidate.node.contributionReview ?? "owner_unconfirmed" as const, targetFit: "unset" as const }]
      : entry.contributions.filter((item) => item.sourceNodeId !== nodeId);
    updateEntry(entryIndex, { contributions });
  };
  const setContribution = (entryIndex: number, contributionIndex: number, update: Partial<(typeof entries)[number]["contributions"][number]>) => {
    const entry = entries[entryIndex];
    updateEntry(entryIndex, { contributions: entry.contributions.map((item, i) => i === contributionIndex ? { ...item, ...update } : item) });
  };
  const moveEntry = (index: number, direction: -1 | 1) => setEntries((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const save = (event: FormEvent<HTMLFormElement>) => {
    if (!title.trim() || !targetRole.trim()) { event.preventDefault(); setError("标题和目标读者不能为空。"); return; }
    setError("");
  };

  return <div className="grid gap-6">
    <form action={action} onSubmit={save} className="grid gap-6">
      <input type="hidden" name="id" value={draft.id} />
      <input type="hidden" name="contentJson" value={JSON.stringify({ entries })} />
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm">私人简历标题<input className={inputClass} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} name="title" /></label>
        <label className="grid gap-1.5 text-sm">目标岗位 / 读者<input className={inputClass} maxLength={240} value={targetRole} onChange={(event) => setTargetRole(event.target.value)} name="targetRole" /></label>
      </section>

      {notice === "saved" ? <p role="status" className="rounded-lg border border-emerald-700/30 bg-emerald-50 p-3 text-sm text-emerald-900">草稿与排序已保存。</p> : null}
      {notice === "invalid-selection" ? <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">选中的项目、经历或贡献已不存在，或贡献没有关联到所选项目。请检查选择后保存。</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      <section className="grid gap-3"><div><h2 className="text-xl font-semibold">选择项目与经历</h2><p className="text-sm leading-6 text-muted-foreground">结构完整性、个人归属核对和目标相关性分开显示。相关性由你手动判断；字段齐全不代表项目质量或岗位匹配。</p></div>
        {groups.map((group) => {
          const selected = entries.some((entry) => entry.sourceNodeId === group.project.node.id);
          return <article key={group.project.node.id} className="grid gap-3 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-semibold">{group.project.node.title}</h3><p className="text-sm leading-6 text-muted-foreground">{group.project.node.summary || "尚无简介"}</p><p className="mt-1 text-xs text-muted-foreground">{group.project.node.type === "experience" ? "经历" : "项目"} · {group.project.node.visibility === "personal" ? "个人" : "公开"} · 结构缺项：{group.project.missing.length || "无"}</p></div>
              <button type="button" onClick={() => selected ? setEntries((current) => current.filter((entry) => entry.sourceNodeId !== group.project.node.id)) : addEntry(group)} className="rounded-full border border-border px-3 py-1.5 text-sm">{selected ? "移除此项目" : "加入草稿"}</button>
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
          <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">项目顺序 {index + 1} · 原始来源 {entry.sourceNodeId}</p><h3 className="text-lg font-semibold">{entry.title}</h3></div><div className="flex gap-2"><button type="button" disabled={index === 0} onClick={() => moveEntry(index, -1)} className="rounded border border-border px-2 py-1 text-sm">上移</button><button type="button" disabled={index === entries.length - 1} onClick={() => moveEntry(index, 1)} className="rounded border border-border px-2 py-1 text-sm">下移</button><button type="button" onClick={() => setEntries((current) => current.filter((_, i) => i !== index))} className="rounded border border-border px-2 py-1 text-sm">移除</button></div></header>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">简历专用项目标题<input className={inputClass} value={entry.title} onChange={(event) => updateEntry(index, { title: event.target.value })} /></label>
            <label className="grid gap-1 text-sm">简历专用角色<input className={inputClass} value={entry.role} onChange={(event) => updateEntry(index, { role: event.target.value })} /></label>
            <label className="grid gap-1 text-sm md:col-span-2">项目背景 / 简介<textarea className={inputClass} rows={3} value={entry.summary} onChange={(event) => updateEntry(index, { summary: event.target.value })} /></label>
            <label className="grid gap-1 text-sm">开始时间<input className={inputClass} value={entry.timeStart ?? ""} onChange={(event) => updateEntry(index, { timeStart: event.target.value || null })} /></label>
            <label className="grid gap-1 text-sm">结束时间<input className={inputClass} value={entry.timeEnd ?? ""} onChange={(event) => updateEntry(index, { timeEnd: event.target.value || null })} /></label>
            <label className="grid gap-1 text-sm">目标相关性<select className={inputClass} value={entry.targetFit} onChange={(event) => updateEntry(index, { targetFit: event.target.value as Fit })}>{Object.entries(fitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="grid gap-1 text-sm">私人来源引用（逗号分隔）<input className={inputClass} value={entry.sourceRefs.join(", ")} onChange={(event) => updateEntry(index, { sourceRefs: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
          </div>
          {entry.contributions.length ? <div className="grid gap-3 rounded-lg bg-muted/30 p-3"><h4 className="font-medium">所选贡献与简历文案</h4>{entry.contributions.map((item, contributionIndex) => {
            const node = group?.contributions.find((candidate) => candidate.node.id === item.sourceNodeId)?.node;
            return <div key={item.sourceNodeId} className="grid gap-2 border-t border-border pt-3">
              <p className="text-sm font-medium">{node?.title ?? item.sourceNodeId} <span className="ml-2 text-xs text-amber-800">{statusLabel(item.reviewStatus)}</span></p>
              <textarea className={inputClass} rows={3} value={item.text} onChange={(event) => setContribution(index, contributionIndex, { text: event.target.value })} />
              <div className="grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-sm">目标相关性<select className={inputClass} value={item.targetFit} onChange={(event) => setContribution(index, contributionIndex, { targetFit: event.target.value as Fit })}>{Object.entries(fitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="grid gap-1 text-sm">私人来源引用（逗号分隔）<input className={inputClass} value={item.sourceRefs.join(", ")} onChange={(event) => setContribution(index, contributionIndex, { sourceRefs: event.target.value.split(",").map((ref) => ref.trim()).filter(Boolean) })} /></label></div>
              <div className="flex gap-2"><button type="button" disabled={contributionIndex === 0} onClick={() => { const next = [...entry.contributions]; [next[contributionIndex - 1], next[contributionIndex]] = [next[contributionIndex], next[contributionIndex - 1]]; updateEntry(index, { contributions: next }); }} className="rounded border border-border px-2 py-1 text-xs">贡献上移</button><button type="button" disabled={contributionIndex === entry.contributions.length - 1} onClick={() => { const next = [...entry.contributions]; [next[contributionIndex + 1], next[contributionIndex]] = [next[contributionIndex], next[contributionIndex + 1]]; updateEntry(index, { contributions: next }); }} className="rounded border border-border px-2 py-1 text-xs">贡献下移</button></div>
            </div>;
          })}</div> : <p className="text-sm text-muted-foreground">尚未选择贡献。可先保存项目摘要，再勾选上方的独立贡献。</p>}
        </article>;
      }) : <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">尚未选择项目或经历。</p>}</section>

      <div className="flex flex-wrap items-center gap-3"><button className="rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground">保存私人草稿</button><Link className="rounded-full border border-border px-5 py-2.5 text-sm" href={`/admin/resume/drafts/${draft.id}/preview`}>打开私人简历预览 →</Link><span className="text-xs text-muted-foreground">更新于 {new Date(draft.updatedAt).toLocaleString("zh-HK")}</span></div>
    </form>
  </div>;
}
