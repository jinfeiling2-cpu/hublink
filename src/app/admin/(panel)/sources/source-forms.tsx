"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { pullRepository, saveXiaohongshu, type FormState } from "../../actions";

export function GithubForm() {
  const [state, action, pending] = useActionState(pullRepository, { error: "" } satisfies FormState);
  return (
    <form action={action} className="grid gap-3">
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <label className="grid gap-1.5">
        <Label htmlFor="repo">仓库</Label>
        <Input id="repo" name="repo" placeholder="owner/repo" required />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "拉取中…" : "拉取快照"}
      </Button>
    </form>
  );
}

export function XiaohongshuForm() {
  const [state, action, pending] = useActionState(saveXiaohongshu, { error: "" } satisfies FormState);
  return (
    <form action={action} className="grid gap-3">
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <label className="grid gap-1.5">
        <Label htmlFor="title">账号名称</Label>
        <Input id="title" name="title" required />
      </label>
      <label className="grid gap-1.5">
        <Label htmlFor="primaryUrl">主页链接</Label>
        <Input id="primaryUrl" name="primaryUrl" type="url" placeholder="https://" required />
      </label>
      <label className="grid gap-1.5">
        <Label htmlFor="summary">这个账号在图里是什么</Label>
        <Textarea id="summary" name="summary" placeholder="以图片为主，或承载了哪些需要深入的内容。" />
      </label>
      <label className="grid gap-1.5">
        <Label>可见性</Label>
        <select name="visibility" defaultValue="personal" className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm">
          <option value="personal">个人</option>
          <option value="public">公开</option>
        </select>
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "保存中…" : "登记账号"}
      </Button>
    </form>
  );
}
