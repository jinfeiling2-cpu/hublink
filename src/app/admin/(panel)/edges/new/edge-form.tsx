"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { edgeTypes } from "@/domain/registry";
import { saveEdge, type FormState } from "../../../actions";

export function EdgeForm({ nodes }: { nodes: { id: string; title: string; typeLabel: string }[] }) {
  const [state, action, pending] = useActionState(saveEdge, { error: "" } satisfies FormState);
  return (
    <form action={action} className="grid gap-4">
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <NodeSelect name="sourceId" label="起点" nodes={nodes} />
      <NodeSelect name="targetId" label="终点" nodes={nodes} />
      <label className="grid gap-1.5">
        <Label>类型</Label>
        <select name="type" className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm" defaultValue="contains">
          {edgeTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label} · {type.description}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5">
        <Label htmlFor="label">连接理由</Label>
        <Input id="label" name="label" placeholder="共享什么问题？依据在哪个节点？哪些只是推断？" />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <Label htmlFor="strength">人工关联权重</Label>
          <Input id="strength" name="strength" type="number" min={0} max={1} step={0.05} defaultValue={0} />
          <span className="text-xs text-muted-foreground">用于整理和筛选；0 表示未评级，数值不是概率或人格测量。</span>
        </label>
        <label className="grid gap-1.5">
          <Label htmlFor="sortOrder">序号</Label>
          <Input id="sortOrder" name="sortOrder" type="number" step={1} defaultValue={0} />
          <span className="text-xs text-muted-foreground">运行步骤和包含关系会按序号排列。</span>
        </label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "保存中…" : "保存连线"}
      </Button>
    </form>
  );
}

function NodeSelect({
  name,
  label,
  nodes,
}: {
  name: string;
  label: string;
  nodes: { id: string; title: string; typeLabel: string }[];
}) {
  return (
    <label className="grid gap-1.5">
      <Label>{label}</Label>
      <select name={name} required className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm" defaultValue={nodes[0]?.id ?? ""}>
        {nodes.map((node) => (
          <option key={node.id} value={node.id}>
            {node.title} · {node.typeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
