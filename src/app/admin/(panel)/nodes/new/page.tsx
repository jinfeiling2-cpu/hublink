import { NodeForm } from "@/components/node-form";
import { saveNode } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function NewNodePage({ searchParams }: { searchParams: Promise<{ type?: string; parentNodeId?: string }> }) {
  const query = await searchParams;
  const contribution = query.type === "contribution";
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{contribution ? "新建个人贡献" : "新建节点"}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{contribution ? "记录一项个人行动；事实依据与个人归属核对分开填写。新建贡献默认个人可见。" : "先写下识别层。说明、度量、类别和出口可以随后补。默认是个人，不会出现在公开阅读页。"}</p>
      </header>
      <NodeForm action={saveNode} defaultType={contribution ? "contribution" : undefined} parentNodeId={query.parentNodeId} />
    </main>
  );
}
