"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatExitLinks } from "@/domain/schema";
import { categories, categoryGroups, nodeTypes, statuses } from "@/domain/registry";
import type { NodeRecord } from "@/domain/types";

type FormState = { error: string };

const fieldClass = "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function NodeForm({
  action,
  node,
  parentNodeId,
  defaultType,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  node?: NodeRecord;
  parentNodeId?: string;
  defaultType?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [nodeType, setNodeType] = useState(node?.type ?? defaultType ?? "project");

  return (
    <form action={formAction} className="grid gap-5">
      {node ? <input type="hidden" name="id" value={node.id} /> : null}
      {parentNodeId ? <input type="hidden" name="parentNodeId" value={parentNodeId} /> : null}
      {state.error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <Label>类型</Label>
          <select name="type" value={nodeType} onChange={(event) => setNodeType(event.target.value)} className={fieldClass}>
            {nodeTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <Label>可见性</Label>
          <select name="visibility" defaultValue={node?.visibility ?? "personal"} className={fieldClass}>
            <option value="personal">个人</option>
            <option value="public">公开</option>
          </select>
          <span className="text-xs text-muted-foreground">手写内容默认个人。公开页只读取标成公开的节点。</span>
        </label>
      </div>

      {nodeType === "contribution" ? <div className="grid gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <Label htmlFor="contributionReview">个人归属核对</Label>
        <select id="contributionReview" name="contributionReview" defaultValue={node?.contributionReview ?? "owner_unconfirmed"} className={fieldClass}>
          <option value="system_verified">仅系统事实由代码/资料确认，个人归属未核验</option>
          <option value="owner_unconfirmed">个人行动与归属待本人确认</option>
          <option value="owner_confirmed">本人已确认这项个人贡献</option>
        </select>
        <span className="text-xs leading-5 text-muted-foreground">核对状态与公开/个人可见性分开。新贡献默认个人；未经本人确认不能设为公开。</span>
      </div> : <input type="hidden" name="contributionReview" value="" />}

      <label className="grid gap-1.5">
        <Label htmlFor="title">标题</Label>
        <Input id="title" name="title" defaultValue={node?.title ?? ""} required maxLength={120} />
      </label>
      <label className="grid gap-1.5">
        <Label htmlFor="summary">识别层 · 精确简介</Label>
        <Textarea id="summary" name="summary" defaultValue={node?.summary ?? ""} maxLength={400} placeholder="读者在简历式浏览里应该读到的那一两句。" />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <Label htmlFor="role">角色</Label>
          <Input id="role" name="role" defaultValue={node?.role ?? ""} maxLength={80} placeholder="主导、参与，或更具体的职责" />
        </label>
        <label className="grid gap-1.5">
          <Label htmlFor="outcome">结果</Label>
          <Input id="outcome" name="outcome" defaultValue={node?.outcome ?? ""} maxLength={200} />
        </label>
      </div>
      <label className="grid gap-1.5">
        <Label htmlFor="body">说明层</Label>
        <Textarea id="body" name="body" defaultValue={node?.body ?? ""} className="min-h-36" maxLength={8000} placeholder="问题、做法、这段经历里实际做了什么。架构和运行用连线展开，不写在这里代替。" />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1.5">
          <Label htmlFor="timeStart">开始</Label>
          <Input id="timeStart" name="timeStart" type="month" defaultValue={node?.timeStart ?? ""} />
        </label>
        <label className="grid gap-1.5">
          <Label htmlFor="timeEnd">结束</Label>
          <Input id="timeEnd" name="timeEnd" type="month" defaultValue={node?.timeEnd ?? ""} />
        </label>
        <label className="grid gap-1.5">
          <Label>状态</Label>
          <select name="status" defaultValue={node?.status ?? ""} className={fieldClass}>
            <option value="">未标注</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <NumberField name="scale" label="规模" defaultValue={node?.scale ?? 0} hint="0 到 1，由你判断。" />
        <NumberField name="importance" label="重要性" defaultValue={node?.importance ?? 0} hint="它在工作里有多重。" />
        <NumberField name="centrality" label="个人关联度" defaultValue={node?.centrality ?? 0} hint="与你的经历、工作主线和方向关联得有多紧；不按连线数量计算。" />
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">类别</legend>
        {categoryGroups.map((group) => (
          <div key={group.id} className="grid gap-2">
            <p className="text-xs text-muted-foreground">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {categories
                .filter((item) => item.group === group.id)
                .map((item) => (
                  <label key={item.id} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      name="categoryIds"
                      value={item.id}
                      defaultChecked={node?.categoryIds.includes(item.id) ?? false}
                    />
                    {item.label}
                  </label>
                ))}
            </div>
          </div>
        ))}
      </fieldset>

      <label className="grid gap-1.5">
        <Label htmlFor="primaryUrl">主出口</Label>
        <Input id="primaryUrl" name="primaryUrl" type="url" defaultValue={node?.primaryUrl ?? ""} placeholder="https://" />
      </label>
      <label className="grid gap-1.5">
        <Label htmlFor="exitLinks">其他深链</Label>
        <Textarea id="exitLinks" name="exitLinks" defaultValue={node ? formatExitLinks(node.exitLinks) : ""} placeholder={"实现 | https://github.com/owner/repo/tree/main/src"} />
        <span className="text-xs text-muted-foreground">一行一条：名称 | 网址。</span>
      </label>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存节点"}
        </Button>
      </div>
    </form>
  );
}

function NumberField({
  name,
  label,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: number;
  hint: string;
}) {
  return (
    <label className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" min={0} max={1} step={0.05} defaultValue={defaultValue} />
      <span className="text-xs text-muted-foreground">{hint}</span>
    </label>
  );
}
