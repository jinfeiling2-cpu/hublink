import { categoryGroups, edgeTypes, layers, nodeTypes, sourceAdapters, views } from "@/domain/registry";

const groups = [
  { id: "composition", label: "组成" },
  { id: "evidence", label: "证据" },
  { id: "course", label: "历程" },
  { id: "source", label: "来源" },
] as const;

export default function FrameworkPage() {
  return (
    <main className="mx-auto grid max-w-5xl gap-12 px-4 py-10">
      <header className="grid max-w-3xl gap-3">
        <p className="text-sm text-muted-foreground">框架登记</p>
        <h1 className="text-4xl font-semibold tracking-tight">这张图如何被阅读。</h1>
        <p className="leading-7 text-muted-foreground">
          类型、连接、维度、阅览和来源都登记在代码里。新增一种读法，优先加一条登记，而不是另写一套页面。完整说明在仓库的 <code>docs/框架说明.md</code>。
        </p>
      </header>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">节点的五层</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {layers.map((layer) => (
            <article key={layer.id} className="rounded-xl border border-border p-4">
              <h3 className="font-medium">{layer.label}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{layer.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">节点类型</h2>
        <div className="grid gap-3">
          {nodeTypes.map((type) => (
            <article key={type.id} className="grid gap-1 rounded-xl border border-border p-4 md:grid-cols-[10rem_1fr]">
              <h3 className="font-medium">{type.label}</h3>
              <div className="grid gap-1 text-sm leading-6 text-muted-foreground">
                <p>{type.description}</p>
                <p>使用的层：{type.layers.join("、") || "无"}</p>
                <p>向下的连接：{type.childEdgeTypes.join("、") || "无"}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">连接</h2>
        {groups.map((group) => (
          <div key={group.id} className="grid gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">{group.label}</h3>
            {edgeTypes
              .filter((edge) => edge.group === group.id)
              .map((edge) => (
                <p key={edge.id} className="text-sm leading-6">
                  <span className="font-medium">{edge.label}</span>
                  <span className="text-muted-foreground"> · {edge.description}</span>
                </p>
              ))}
          </div>
        ))}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">维度</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          度量可以当作排序键或三维网格的轴：时间、规模、重要性、个人关联度、联系。类别用来筛选和分组。
        </p>
        <div className="flex flex-wrap gap-2">
          {categoryGroups.map((group) => (
            <span key={group.id} className="rounded-md border border-border px-2 py-1 text-sm">
              {group.label}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">阅览框架</h2>
        {views.map((view) => (
          <p key={view.id} className="text-sm leading-6">
            <span className="font-medium">{view.name}</span>
            <span className="text-muted-foreground"> · {view.question}</span>
          </p>
        ))}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">来源</h2>
        {sourceAdapters.map((source) => (
          <article key={source.id} className="rounded-xl border border-border p-4">
            <h3 className="font-medium">{source.label}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{source.summary}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
