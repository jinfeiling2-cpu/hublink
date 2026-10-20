"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type FormState } from "../actions";

export function LoginForm({ showDevHint }: { showDevHint: boolean }) {
  const [state, action, pending] = useActionState(login, { error: "" } satisfies FormState);
  return (
    <form action={action} className="grid gap-4">
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <label className="grid gap-1.5">
        <Label htmlFor="password">口令</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </label>
      {showDevHint ? (
        <p className="text-xs leading-5 text-muted-foreground">当前没有设置 ADMIN_PASSWORD，开发口令是 dev-hublink-admin。</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "核对中…" : "进入"}
      </Button>
    </form>
  );
}
