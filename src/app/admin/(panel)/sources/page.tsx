import { sourceAdapters } from "@/domain/registry";
import { GithubForm, XiaohongshuForm } from "./source-forms";

export const dynamic = "force-dynamic";

export default function SourcesPage() {
  const github = sourceAdapters.find((item) => item.id === "github");
  const xiaohongshu = sourceAdapters.find((item) => item.id === "xiaohongshu");
  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 py-8">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">来源</h1>
        <p className="text-sm leading-6 text-muted-foreground">拉取只填写快照和新建时的简介。说明层、架构和可见性的后续修改都留在节点上。</p>
      </header>
      <section className="grid gap-4 rounded-xl border border-border p-4">
        <div>
          <h2 className="font-medium">GitHub</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{github?.summary}</p>
        </div>
        <GithubForm />
      </section>
      <section className="grid gap-4 rounded-xl border border-border p-4">
        <div>
          <h2 className="font-medium">小红书</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{xiaohongshu?.summary}</p>
        </div>
        <XiaohongshuForm />
      </section>
    </main>
  );
}
