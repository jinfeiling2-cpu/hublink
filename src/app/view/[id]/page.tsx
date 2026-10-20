import Link from "next/link";
import { notFound } from "next/navigation";
import { groupByCategory, impressionSelection, rankNodes, rootsForTraverse, toAxisPoints, traverseTree, visibleGraph, type TraverseHit } from "@/domain/graph";
import { edgeTypeById, isMeasureKey, measureLabel, nodeTypeById, viewById, type AxisConfig, type RankConfig, type TraverseConfig } from "@/domain/registry";
import type { EdgeRecord, MeasureKey, NodeRecord } from "@/domain/types";
import { AxisView } from "@/components/axis-view";
import { measureText, typeLabel, whenLabel } from "@/lib/present";
import { listEdges, listNodes } from "@/db/store";

export const dynamic = "force-dynamic";

export default async function ViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const view = viewById(id);
  if (!view) notFound();
  const graph = visibleGraph(listNodes("public"), listEdges("public"), "public");

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-10">
      <header className="grid gap-2">
        <p className="text-sm text-muted-foreground">阅览</p>
        <h1 className="text-3xl font-semibold tracking-tight">{view.name}</h1>
        <p className="max-w-2xl leading-7 text-muted-foreground">{view.question}</p>
      </header>
      {graph.nodes.length === 0 ? (
        <EmptyView />
      ) : view.kind === "template" ? (
        <Impression nodes={graph.nodes} edges={graph.edges} />
      ) : view.kind === "rank" ? (
        <Rank nodes={graph.nodes} edges={graph.edges} config={view.config as RankConfig} />
      ) : view.kind === "axis3" ? (
        <Axis nodes={graph.nodes} edges={graph.edges} config={view.config as AxisConfig} query={query} />
      ) : (
        <Traverse viewId={view.id} nodes={graph.nodes} edges={graph.edges} config={view.config as TraverseConfig} query={query} />
      )}
    </main>
  );
}

function EmptyView() {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-8 text-sm leading-6 text-muted-foreground">
      还没有公开节点。后台写入并标成公开之后，这一页会按当前框架排布。个人节点不会出现在这里。
    </div>
  );
}

function Impression({ nodes, edges }: { nodes: NodeRecord[]; edges: EdgeRecord[] }) {
  const selection = impressionSelection(nodes, edges);
  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        {selection.person ? (
          <>
            <p className="text-sm text-muted-foreground">人</p>
            <h2 className="text-4xl font-semibold tracking-tight">
              <Link href={`/node/${selection.person.id}`} className="hover:underline">
                {selection.person.title}
              </Link>
            </h2>
            <p className="max-w-2xl text-lg leading-8">{selection.person.summary || "识别层还空着。"}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">还没有公开的「人」节点。其他类型仍会按亲疏和重要性列出。</p>
        )}
      </section>
      <div className="grid gap-6 md:grid-cols-3">
        <Column title="方向" empty="还没有公开的方向。" nodes={selection.directions} />
        <Column title="项目" empty="还没有公开的项目。" nodes={selection.projects} />
        <Column title="经历" empty="还没有公开的经历。" nodes={selection.experiences} />
      </div>
      <p className="text-xs leading-5 text-muted-foreground">这一页只用识别层：人取亲疏最高的一个，方向取亲疏前三，项目取重要性前三，经历取时间最近的四段。</p>
    </div>
  );
}

function Column({ title, empty, nodes }: { title: string; empty: string; nodes: NodeRecord[] }) {
  return (
    <section className="grid content-start gap-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {nodes.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : nodes.map((node) => <NodeCard key={node.id} node={node} />)}
    </section>
  );
}

function Rank({ nodes, edges, config }: { nodes: NodeRecord[]; edges: EdgeRecord[]; config: RankConfig }) {
  const ranked = rankNodes(nodes, edges, config.measure, config.direction ?? "desc");
  if (!config.groupBy) {
    return (
      <ol className="grid gap-3">
        {ranked.map((node, index) => (
          <li key={node.id}>
            <NodeCard node={node} index={index + 1} meta={measureText(node, edges, config.measure)} />
          </li>
        ))}
      </ol>
    );
  }
  const grouped = groupByCategory(ranked, config.groupBy);
  return (
    <div className="grid gap-6">
      {grouped.groups.map((group) => (
        <section key={group.id} className="grid gap-2">
          <h2 className="text-sm font-medium">{group.label}</h2>
          {group.nodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">这一类还没有公开节点。</p>
          ) : (
            group.nodes.map((node) => <NodeCard key={node.id} node={node} meta={measureText(node, edges, config.measure)} />)
          )}
        </section>
      ))}
      {grouped.ungrouped.length > 0 ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-medium">未归入这一面</h2>
          {grouped.ungrouped.map((node) => (
            <NodeCard key={node.id} node={node} meta={measureText(node, edges, config.measure)} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function Axis({
  nodes,
  edges,
  config,
  query,
}: {
  nodes: NodeRecord[];
  edges: EdgeRecord[];
  config: AxisConfig;
  query: Record<string, string | string[] | undefined>;
}) {
  const x = readMeasure(query.x, config.x);
  const y = readMeasure(query.y, config.y);
  const z = readMeasure(query.z, config.z);
  const points = toAxisPoints(nodes, edges, x, y, z);
  return (
    <div className="grid gap-4">
      <form action="/view/space" className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <AxisSelect name="x" label="横轴" value={x} />
        <AxisSelect name="y" label="纵轴" value={y} />
        <AxisSelect name="z" label="深轴" value={z} />
        <button type="submit" className="h-9 rounded-lg bg-primary px-3 text-sm text-primary-foreground">
          应用坐标
        </button>
      </form>
      <p className="text-xs text-muted-foreground">拖动可以转动这张网格。没有填写的度量会靠在起点。</p>
      <AxisView points={points} axes={[measureLabel(x), measureLabel(y), measureLabel(z)]} />
    </div>
  );
}

function AxisSelect({ name, label, value }: { name: string; label: string; value: MeasureKey }) {
  const keys: MeasureKey[] = ["time", "scale", "importance", "centrality", "degree"];
  return (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      <select name={name} defaultValue={value} className="h-9 rounded-lg border border-input bg-transparent px-2">
        {keys.map((key) => (
          <option key={key} value={key}>
            {measureLabel(key)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Traverse({
  viewId,
  nodes,
  edges,
  config,
  query,
}: {
  viewId: string;
  nodes: NodeRecord[];
  edges: EdgeRecord[];
  config: TraverseConfig;
  query: Record<string, string | string[] | undefined>;
}) {
  const roots = rootsForTraverse(nodes, config);
  const requested = firstQuery(query.root);
  const selected = roots.find((node) => node.id === requested) ?? roots[0];
  if (!selected) {
    return <p className="text-sm text-muted-foreground">还没有公开的{nodeTypeById(config.rootType)?.label ?? "这类"}节点。</p>;
  }
  const tree = traverseTree(selected.id, edges, config.edgeTypes, config.maxDepth);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return (
    <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
      <aside className="grid content-start gap-2">
        {roots.map((root) => (
          <Link
            key={root.id}
            href={`/view/${viewId}?root=${root.id}`}
            className={`rounded-lg px-3 py-2 text-sm ${root.id === selected.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {root.title}
          </Link>
        ))}
      </aside>
      <Tree hit={tree} byId={byId} />
    </div>
  );
}

function Tree({ hit, byId }: { hit: TraverseHit; byId: Map<string, NodeRecord> }) {
  const node = byId.get(hit.id);
  if (!node) return null;
  return (
    <article className="grid gap-3">
      {hit.via ? <p className="text-xs text-muted-foreground">{edgeTypeById(hit.via)?.label}</p> : null}
      <div>
        <h2 className="text-2xl font-semibold">
          <Link href={`/node/${node.id}`} className="hover:underline">
            {node.title}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {typeLabel(node.type)} · {whenLabel(node)}
        </p>
        {node.summary ? <p className="mt-3 max-w-2xl leading-7">{node.summary}</p> : null}
      </div>
      {hit.children.length === 0 ? (
        <p className="text-sm text-muted-foreground">这一层没有继续拆开的公开连接。</p>
      ) : (
        <div className="grid gap-4 border-l border-border pl-4">
          {hit.children.map((child) => (
            <Tree key={`${child.edgeId ?? child.via}-${child.id}`} hit={child} byId={byId} />
          ))}
        </div>
      )}
    </article>
  );
}

function NodeCard({ node, index, meta }: { node: NodeRecord; index?: number; meta?: string }) {
  return (
    <Link href={`/node/${node.id}`} className="grid gap-1 rounded-xl border border-border px-4 py-3 hover:bg-accent">
      <span className="text-xs text-muted-foreground">
        {index ? `${index} · ` : ""}
        {typeLabel(node.type)}
        {meta ? ` · ${meta}` : ""}
      </span>
      <span className="font-medium">{node.title}</span>
      {node.summary ? <span className="text-sm leading-6 text-muted-foreground">{node.summary}</span> : null}
    </Link>
  );
}

function readMeasure(value: string | string[] | undefined, fallback: MeasureKey): MeasureKey {
  const picked = firstQuery(value);
  return picked && isMeasureKey(picked) ? picked : fallback;
}

function firstQuery(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
