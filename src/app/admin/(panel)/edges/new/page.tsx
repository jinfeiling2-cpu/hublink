import Link from "next/link";
import { listNodes } from "@/db/store";
import { typeLabel } from "@/lib/present";
import { EdgeForm } from "./edge-form";

export const dynamic = "force-dynamic";

export default function NewEdgePage() {
  const nodes = listNodes().map((node) => ({ id: node.id, title: node.title, typeLabel: typeLabel(node.type) }));
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">新建连线</h1>
        <p className="text-sm leading-6 text-muted-foreground">从起点指向终点。包含、依赖、产出、引出，用的是不同的类型。任一端是个人节点时，这条线不会出现在公开页。</p>
      </header>
      {nodes.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          至少需要两个节点才能连线。<Link href="/admin/nodes/new" className="underline underline-offset-4">先去新建</Link>。
        </p>
      ) : (
        <EdgeForm nodes={nodes} />
      )}
    </main>
  );
}
