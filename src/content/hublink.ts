import type { Visibility } from "@/domain/types";

export type HublinkNode = {
  id: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  role: string;
  outcome: string;
  status: string;
  timeStart: string | null;
  timeEnd: string | null;
  scale: number;
  importance: number;
  centrality: number;
  visibility: Visibility;
  categoryIds: string[];
};

export type HublinkEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  sortOrder: number;
};

function node(partial: Pick<HublinkNode, "id" | "type" | "title" | "summary"> & Partial<HublinkNode>): HublinkNode {
  return {
    body: "",
    role: "",
    outcome: "",
    status: "",
    timeStart: "2026-10",
    timeEnd: null,
    scale: 0.3,
    importance: 0.45,
    centrality: 0.4,
    visibility: "public",
    categoryIds: [],
    ...partial,
  };
}

export const hublinkNodes: HublinkNode[] = [
  node({
    id: "hublink",
    type: "project",
    title: "Hublink",
    summary: "这个点的内部图是代码框架：目录、文件，以及一次读取、一次写入实际调用了哪些函数。",
    body: `圆对应实现，不对应「看法」「留白」这种概念。每一支是一块代码，线是包含、依赖或调用顺序。

页面在 src/app，规则在 src/domain，图的数据在 src/db 的 SQLite。读取、写入、画布、拉取是这些文件跑起来的路径。

这份内部图的原文在 src/content/hublink.ts。种子版本变化时，启动会用这份代码换掉旧的讲解点。其他项目节点不动。`,
    role: "构建",
    outcome: "阅读页、后台和公开查询已经按这套代码在跑。履历和其他作品还没有写进数据库。",
    status: "exploring",
    scale: 0.45,
    importance: 0.92,
    centrality: 0.85,
    categoryIds: ["activity.making", "artifact.system", "scope.personal", "stance.lead"],
  }),

  node({
    id: "hublink.app",
    type: "part",
    title: "页面",
    summary: "读者能打开的地址在 src/app。它们是服务器组件，每次请求现查数据库。",
    body: "入口、阅览、单点、公开 JSON、框架页都在这一支。它们自己不保存另一份正文，只调用领域函数和数据库。",
    importance: 0.76,
    scale: 0.4,
  }),
  node({
    id: "hublink.app.home",
    type: "part",
    title: "入口",
    summary: "src/app/page.tsx 读取公开图，把圆和线交给节点图组件，再列出登记过的阅览。",
    body: "文件导出 dynamic = \"force-dynamic\"。调用的是 listNodes(\"public\")、listEdges(\"public\") 和 toNetworkData。",
  }),
  node({
    id: "hublink.app.view",
    type: "part",
    title: "阅览分支",
    summary: "src/app/view/[id]/page.tsx 用 view.kind 分支：network、template、rank、axis3、traverse。",
    body: "kind 来自 src/domain/registry.ts 的 views。排序和深入在服务器上输出 HTML。节点图和三维网格把算好的数据交给客户端组件。",
    importance: 0.6,
  }),
  node({
    id: "hublink.app.node",
    type: "part",
    title: "单点页",
    summary: "src/app/node/[id]/page.tsx 只在公开节点里查找。找不到就 404。",
    body: "页首用 localGraph 取出从这个点沿连线走到的子图，再交给 NetworkGraph。说明、出口和快照里的星标分开展示。",
  }),
  node({
    id: "hublink.app.api",
    type: "part",
    title: "公开接口",
    summary: "src/app/api/graph/route.ts 的 GET 返回公开节点、连线和阅览名单。",
    body: "快照经过 publicSnapshot，README 摘录和根目录不会出现在 JSON 里。",
  }),

  node({
    id: "hublink.domain",
    type: "part",
    title: "领域",
    summary: "与页面无关的框架在 src/domain。筛选、排序、深入和来源合并都写在这里。",
    body: "四个文件：类型、登记、算法、校验。新的阅览先加进登记表，再在阅览页增加对应分支。",
    importance: 0.88,
    scale: 0.55,
    centrality: 0.7,
  }),
  node({
    id: "hublink.domain.types",
    type: "part",
    title: "类型",
    summary: "src/domain/types.ts 定义 NodeRecord、EdgeRecord、Visibility、NodeInput、SourcePull、SourceSnapshot。",
    body: "可见性只有 public 和 personal。来源快照和作者写的说明是两个字段。",
  }),
  node({
    id: "hublink.domain.registry",
    type: "part",
    title: "登记",
    summary: "src/domain/registry.ts 登记节点类型、连线类型、度量、阅览和来源适配器。",
    body: "views 里每种阅览有 kind 和 config。项目深入允许的连线是 contains、depends_on、feeds、step、leads_to，深度 5。",
    importance: 0.62,
  }),
  node({
    id: "hublink.domain.graph",
    type: "part",
    title: "算法",
    summary: "src/domain/graph.ts 实现 visibleGraph、rankNodes、traverseTree、toAxisPoints、impressionSelection、mergeSourcePull。",
    body: "traverseTree 只沿 source 到 target 走，用 seen 挡住环。rankNodes 把没有时间的点排到最后。mergeSourcePull 在节点已存在时保留标题、简介、说明、角色、结果和可见性。",
    importance: 0.74,
    centrality: 0.66,
  }),
  node({
    id: "hublink.domain.schema",
    type: "part",
    title: "校验",
    summary: "src/domain/schema.ts 用 zod 检查表单。nodeInputSchema 限制 0 到 1 的数字，网址必须是 http 或空。",
    body: "readNodeFields 读 FormData。手写新建的节点默认 visibility 为 personal。",
  }),

  node({
    id: "hublink.db",
    type: "part",
    title: "数据库",
    summary: "图存在 data/hublink.sqlite。唯一入口是 src/db/store.ts。这个文件不提交到 Git。",
    body: "第一次连接时打开 WAL，打开外键，建 nodes、edges、node_categories。随后调用 ensureHublinkSeed。",
    importance: 0.82,
    scale: 0.5,
    centrality: 0.6,
  }),
  node({
    id: "hublink.db.query",
    type: "part",
    title: "公开查询",
    summary: "listNodes(\"public\") 的 SQL 是 WHERE visibility = 'public'。listEdges(\"public\") 要求线的两端都是公开节点。",
    body: "过滤发生在查询时。个人行不会进入服务器组件的数据，也就不会进到浏览器里的页面数据。",
    importance: 0.64,
  }),
  node({
    id: "hublink.db.seed",
    type: "part",
    title: "种子",
    summary: "src/db/ensure-hublink.ts 按 src/content/hublink.ts 写入这张内部图。版本号不同时先删掉旧的 hublink 点再写入。",
    body: "版本号相同之后，只补回缺失的编号，不覆盖后台改过的字。其他项目的节点不在这次删除里。",
  }),

  node({
    id: "hublink.read",
    type: "flow",
    title: "一次读取",
    summary: "打开阅读页时，服务器按这四步调用。代码在 src/app、src/db/store.ts 和 src/domain/graph.ts。",
    body: "没有另一套预先生成的公开正文。个人点在第二步离开。",
    importance: 0.7,
  }),
  node({
    id: "hublink.read.route",
    type: "flow",
    title: "进路由",
    summary: "src/app 下的页面是服务器组件，并设置 dynamic = \"force-dynamic\"，因此每次请求都执行后面的查询。",
    body: "地址里的阅览 id 交给 viewById。没有这个登记就 404。",
  }),
  node({
    id: "hublink.read.query",
    type: "flow",
    title: "查公开行",
    summary: "页面调用 listNodes(\"public\") 和 listEdges(\"public\")。个人点和碰着它们的线不会从 SQLite 里读出来。",
    body: "这一步的实现是 src/db/store.ts 里的两条 SQL。",
  }),
  node({
    id: "hublink.read.compute",
    type: "flow",
    title: "按 kind 计算",
    summary: "visibleGraph 再滤一次。然后按 view.kind 调用 impressionSelection、rankNodes、toAxisPoints、traverseTree 或 toNetworkData。",
    body: "这些函数在 src/domain/graph.ts。toNetworkData 在 src/lib/network.ts，专门放在没有 \"use client\" 的文件里，服务器页面才能调用。",
    importance: 0.58,
  }),
  node({
    id: "hublink.read.paint",
    type: "flow",
    title: "输出画面",
    summary: "排序、印象和深入由服务器输出 HTML。节点图和三维网格接收已经算好的数组，在浏览器里绘制。",
    body: "分支写在 src/app/view/[id]/page.tsx。客户端组件是 NetworkGraph 和 AxisView。",
  }),

  node({
    id: "hublink.write",
    type: "flow",
    title: "一次写入",
    summary: "后台保存走 src/app/admin/actions.ts 的服务器动作，写的是 SQLite，不是页面文件。",
    body: "动作都是 async。登录失败的 redirect 放在内层 try 外面，避免被吞掉。",
    importance: 0.62,
  }),
  node({
    id: "hublink.write.session",
    type: "part",
    title: "会话",
    summary: "src/lib/session.ts 用 HMAC-SHA256 签发 cookie hublink_session。isAdmin 在后台布局里决定是否跳去登录。",
    body: "口令来自 ADMIN_PASSWORD。开发且未设置时用 dev-hublink-admin。这个提示只在服务器上计算，不在客户端猜测。",
  }),
  node({
    id: "hublink.write.schema",
    type: "part",
    title: "读表单",
    summary: "src/app/admin/actions.ts 的 saveNode 先走 readNodeFields 和 nodeInputSchema。不合法就回到表单，不写库。",
    body: "编辑已有节点时，actions.ts 保留原来的 sourceKind、sourceExternalId、sourcePrivate 和 sourceSnapshot。",
  }),
  node({
    id: "hublink.write.store",
    type: "part",
    title: "写入表",
    summary: "通过 createNode、updateNode、createEdge、setVisibility 写入 SQLite。新 id 用 crypto.randomUUID。",
    body: "实现在 src/db/store.ts。类别写在 node_categories，保存时先删后插。",
  }),
  node({
    id: "hublink.write.refresh",
    type: "flow",
    title: "刷新缓存",
    summary: "写完调用 revalidatePath(\"/\", \"layout\")。下一次阅读页重新执行公开查询。",
    body: "没有单独的静态导出步骤。页面本来就是每次请求查库。",
  }),

  node({
    id: "hublink.canvas",
    type: "part",
    title: "画布",
    summary: "src/components 里两种要在浏览器演算的排法做成了客户端组件。排序、印象和深入没有这支代码。",
    body: "节点图是 d3-force。三维网格是 three 与 react-three-fiber。文件带 \"use client\"。",
    importance: 0.66,
  }),
  node({
    id: "hublink.canvas.network",
    type: "part",
    title: "力导向",
    summary: "src/components/network-graph.tsx 用 d3-force 布局。颜色按 contains 或 step 走到的那一支。",
    body: "点选只把该点与直接邻点留在高亮，并画出「直接相连」。大圆里的字是这一支的标题。服务器不能调用这个文件里的函数。",
    importance: 0.58,
  }),
  node({
    id: "hublink.canvas.data",
    type: "part",
    title: "图数据",
    summary: "src/lib/network.ts 的 toNetworkData 把节点和连线收成画布要的数组，并数出每个点的 degree。",
    body: "它不带 \"use client\"，所以 src/app/page.tsx 和阅览页可以在服务器上调用。",
  }),
  node({
    id: "hublink.canvas.axis",
    type: "part",
    title: "三维网格",
    summary: "src/components/axis-canvas.tsx 只画球体和三根轴。标题是画布下方的链接。",
    body: "AxisView 用 next/dynamic 且 ssr: false 装载画布。不使用 drei 的 Html，避免离开页面时同步卸掉 React 根。",
  }),

  node({
    id: "hublink.pull",
    type: "part",
    title: "拉取",
    summary: "外部仓库进图的实现是官方 HTTP，加上 mergeSourcePull。没有笔记接口的平台没有拉取函数。",
    body: "GitHub 在 src/lib/github.ts。合并规则在 src/domain/graph.ts。小红书表单在 src/app/admin/(panel)/sources/source-forms.tsx，动作是 saveXiaohongshu。",
    importance: 0.55,
  }),
  node({
    id: "hublink.pull.github",
    type: "part",
    title: "GitHub 接口",
    summary: "src/lib/github.ts 的 pullGithubRepo 请求 api.github.com。parseGithubRepo 先解析 owner/repo。",
    body: "摘录截到 480 字，根目录最多 30 项，都放进 SourceSnapshot。令牌只从 GITHUB_TOKEN 读取，不写进错误信息。404、401、403 返回中文说明。",
  }),
  node({
    id: "hublink.pull.merge",
    type: "decision",
    title: "合并规则",
    summary: "src/domain/graph.ts 的 mergeSourcePull：新建时标题和简介来自仓库，说明层是空字符串，可见性看仓库是否私有。",
    body: "节点已经存在时，函数原样返回原来的 title、summary、body、role、outcome、visibility 和 categoryIds，只替换 sourceSnapshot。primaryUrl 仅在原来为空时采用仓库地址。",
    importance: 0.6,
  }),
  node({
    id: "hublink.pull.manual",
    type: "part",
    title: "手写来源",
    summary: "src/app/admin/actions.ts 的 saveXiaohongshu 只保存表单里的主页和说明。代码里没有读取笔记或图片的函数。",
    body: "默认可见性是 personal。官方接口还不能读笔记，所以没有对应的 pull 实现。",
  }),
];

export const hublinkEdges: HublinkEdge[] = [
  edge("hublink", "hublink.app", "contains", 1),
  edge("hublink", "hublink.domain", "contains", 2),
  edge("hublink", "hublink.db", "contains", 3),
  edge("hublink", "hublink.read", "contains", 4),
  edge("hublink", "hublink.write", "contains", 5),
  edge("hublink", "hublink.canvas", "contains", 6),
  edge("hublink", "hublink.pull", "contains", 7),

  edge("hublink.app", "hublink.app.home", "contains", 1),
  edge("hublink.app", "hublink.app.view", "contains", 2),
  edge("hublink.app", "hublink.app.node", "contains", 3),
  edge("hublink.app", "hublink.app.api", "contains", 4),
  edge("hublink.app", "hublink.domain", "depends_on", 1),
  edge("hublink.app", "hublink.db", "depends_on", 2),
  edge("hublink.app", "hublink.canvas", "depends_on", 3),

  edge("hublink.domain", "hublink.domain.types", "contains", 1),
  edge("hublink.domain", "hublink.domain.registry", "contains", 2),
  edge("hublink.domain", "hublink.domain.graph", "contains", 3),
  edge("hublink.domain", "hublink.domain.schema", "contains", 4),
  edge("hublink.domain.graph", "hublink.domain.types", "depends_on", 1),
  edge("hublink.domain.graph", "hublink.domain.registry", "depends_on", 2),
  edge("hublink.domain.schema", "hublink.domain.types", "depends_on", 1),

  edge("hublink.db", "hublink.db.query", "contains", 1),
  edge("hublink.db", "hublink.db.seed", "contains", 2),
  edge("hublink.db", "hublink.domain.types", "depends_on", 1),

  edge("hublink.read", "hublink.read.route", "contains", 1),
  edge("hublink.read", "hublink.read.query", "contains", 2),
  edge("hublink.read", "hublink.read.compute", "contains", 3),
  edge("hublink.read", "hublink.read.paint", "contains", 4),
  edge("hublink.read.route", "hublink.read.query", "step", 1),
  edge("hublink.read.query", "hublink.read.compute", "step", 2),
  edge("hublink.read.compute", "hublink.read.paint", "step", 3),
  edge("hublink.read.query", "hublink.db.query", "depends_on", 1),
  edge("hublink.read.compute", "hublink.domain.graph", "depends_on", 1),
  edge("hublink.read.paint", "hublink.canvas", "depends_on", 1),

  edge("hublink.write", "hublink.write.session", "contains", 1),
  edge("hublink.write", "hublink.write.schema", "contains", 2),
  edge("hublink.write", "hublink.write.store", "contains", 3),
  edge("hublink.write", "hublink.write.refresh", "contains", 4),
  edge("hublink.write.session", "hublink.write.schema", "step", 1),
  edge("hublink.write.schema", "hublink.write.store", "step", 2),
  edge("hublink.write.store", "hublink.write.refresh", "step", 3),
  edge("hublink.write.schema", "hublink.domain.schema", "depends_on", 1),
  edge("hublink.write.store", "hublink.db", "depends_on", 1),

  edge("hublink.canvas", "hublink.canvas.network", "contains", 1),
  edge("hublink.canvas", "hublink.canvas.data", "contains", 2),
  edge("hublink.canvas", "hublink.canvas.axis", "contains", 3),
  edge("hublink.canvas.network", "hublink.domain.registry", "depends_on", 1),
  edge("hublink.canvas.network", "hublink.canvas.data", "depends_on", 2),

  edge("hublink.pull", "hublink.pull.github", "contains", 1),
  edge("hublink.pull", "hublink.pull.merge", "contains", 2),
  edge("hublink.pull", "hublink.pull.manual", "contains", 3),
  edge("hublink.pull.merge", "hublink.domain.graph", "depends_on", 1),
  edge("hublink.pull", "hublink.db", "feeds", 1),
];

function edge(sourceId: string, targetId: string, type: string, sortOrder: number): HublinkEdge {
  return { id: `edge.${sourceId}.${type}.${targetId}`, sourceId, targetId, type, sortOrder };
}
