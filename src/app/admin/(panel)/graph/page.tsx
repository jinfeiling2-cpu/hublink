import { NetworkGraph } from "@/components/network-graph";
import { edgeTypeById } from "@/domain/registry";
import { typeLabel } from "@/lib/present";
import { listEdges, listNodes } from "@/db/store";
import { toNetworkData } from "@/lib/network";

export const dynamic = "force-dynamic";

export default function AdminGraphPage() {
  const nodes = listNodes();
  const edges = listEdges();
  const network = toNetworkData(nodes, edges);
  const titles = new Map(nodes.map((node) => [node.id, node.title]));

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">个人全图</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          这里显示公开和个人节点。公开访客只能看到公开图；这张图用于检查不同目标、方向、项目和创意之间的关系是否有依据。
        </p>
        <p className="text-xs text-muted-foreground">
          {nodes.length} 个节点 · {edges.length} 条连接 · “人工关联权重”只用于当前整理和筛选，不是概率或人格测量。请优先阅读每条连接旁的理由。
        </p>
      </header>
      <section className="rounded-2xl border border-border bg-[#243038] px-3 py-4 text-slate-100 md:px-5">
        <NetworkGraph nodes={network.nodes} edges={network.edges} height={760} nodeLinkBase="/admin/nodes" />
      </section>
      <section className="grid gap-3">
        <h2 className="text-sm font-medium">连接清单</h2>
        <ul className="grid gap-2">
          {edges.map((edge) => (
            <li key={edge.id} className="rounded-xl border border-border px-4 py-3 text-sm leading-6">
              <span className="font-medium">{titles.get(edge.sourceId) ?? edge.sourceId}</span>
              <span className="text-muted-foreground"> — {edgeTypeById(edge.type)?.label ?? edge.type} → </span>
              <span className="font-medium">{titles.get(edge.targetId) ?? edge.targetId}</span>
              {edge.label ? <span className="text-muted-foreground"> · {edge.label}</span> : null}
              <span className="ml-2 text-xs text-muted-foreground">人工关联权重 {edge.strength.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-2 text-sm text-muted-foreground">
        <p>节点类型覆盖：{[...new Set(nodes.map((node) => typeLabel(node.type)))].join("、")}。</p>
        <p>点击图上的节点后，可以进入后台编辑页查看并修改它的摘要、说明、可见性、度量和分类。</p>
      </section>
    </main>
  );
}
