import { redirect } from "next/navigation";
import { isAdmin, usingDevPassword } from "@/lib/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">进入后台</h1>
        <p className="text-sm leading-6 text-muted-foreground">后台可以添加节点、拉连接、切换公开或个人，并从 GitHub 拉取仓库快照。</p>
      </header>
      <LoginForm showDevHint={usingDevPassword()} />
    </main>
  );
}
