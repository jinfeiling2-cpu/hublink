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
    scale: 0.25,
    importance: 0.38,
    centrality: 0.35,
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
    summary: "这个仓库自己。内部的点是目录、文件和一条条调用，不是另一套概念说明。",
    body: `根上是 README.md，说明项目是什么、怎么在本机跑。src 按目录分开：页面、领域规则、数据库、库函数和画布组件。

读取、写入、拉取这三支不另放一份正文，它们把已经存在的文件按真实调用顺序串起来。点进一个文件，能看到它导出的函数和它负责的事。

新文件加进来时，挂到它所属的目录下，再用依赖或下一步连到调用它的文件。履历和其他作品还没有写进这张图。`,
    role: "构建",
    outcome: "阅读页、后台和公开范围已经按这些文件在跑。",
    status: "exploring",
    scale: 0.5,
    importance: 0.95,
    centrality: 0.9,
    categoryIds: ["activity.making", "artifact.system", "scope.personal", "stance.lead"],
  }),

  node({
    id: "hublink.readme",
    type: "part",
    title: "README",
    summary: "README.md，仓库门口的总说明。写这个项目是什么、本机怎么启动、口令和数据库放在哪。",
    body: "设计细节不堆在这里，它指向 docs/框架说明.md。运行是 npm run dev，开发服务器在 43123 端口。图存在 data/hublink.sqlite，不提交。代码在 src/ 下面。",
    importance: 0.72,
    centrality: 0.55,
    scale: 0.35,
  }),
  node({
    id: "hublink.readme.docs",
    type: "part",
    title: "框架说明",
    summary: "docs/框架说明.md。层、连接、公开范围、来源能拉什么，以及目录和文件的对照表。",
    body: "对照表写明 src/domain/registry.ts 登记类型和阅览，src/domain/graph.ts 做过滤和排序，src/db/store.ts 读写 SQLite。读者先看 README，再看这份说明。",
    importance: 0.5,
  }),

  node({
    id: "hublink.app",
    type: "part",
    title: "app",
    summary: "src/app。Next.js 的路由：阅读页、一个点的页面、公开接口和后台动作。",
    body: "页面自己不算规则。它们调用 src/db 把点读出来，调用 src/domain 过滤和排布，再交给 src/components 画。后台的写操作集中在 actions.ts。",
    importance: 0.84,
    centrality: 0.72,
    scale: 0.45,
  }),
  node({
    id: "hublink.app.page",
    type: "part",
    title: "page.tsx",
    summary: "src/app/page.tsx。阅读入口。listNodes(\"public\") 取出公开点，visibleGraph() 滤线，再交给 NetworkGraph。",
    body: "首页不保存另一份内容。圆和线来自数据库里的同一张图。",
    importance: 0.55,
  }),
  node({
    id: "hublink.app.view",
    type: "part",
    title: "view",
    summary: "src/app/view/[id]/page.tsx。地址里的阅览名决定用排序、三维网格、沿连接深入，还是节点图。",
    body: "排法函数在 src/domain/graph.ts：rankNodes()、toAxisPoints()、traverseTree()。节点图仍渲染 NetworkGraph。",
    importance: 0.48,
  }),
  node({
    id: "hublink.app.node",
    type: "part",
    title: "node",
    summary: "src/app/node/[id]/page.tsx。一个公开点的简介、说明、出口，以及从它连出去的那一小张图。",
    body: "个人点在这里直接 404。公开快照只留语言、时间和星标，README 摘录不进页面。",
    importance: 0.46,
  }),
  node({
    id: "hublink.app.route",
    type: "part",
    title: "route.ts",
    summary: "src/app/api/graph/route.ts。GET /api/graph。visibleGraph() 之后用 publicSnapshot() 去掉摘录和根目录。",
    body: "和阅读页同一条过滤。个人点和碰着它们的线不会出现在 JSON 里。",
    importance: 0.5,
  }),
  node({
    id: "hublink.app.actions",
    type: "part",
    title: "actions.ts",
    summary: "src/app/admin/actions.ts。后台的写入口：login()、saveNode()、changeVisibility()、saveEdge()、pullRepository()。",
    body: "每个动作先确认登录。保存节点走 readNodeFields()，再 createNode() 或 updateNode()。拉取仓库走 pullGithubRepo()，再 mergeSourcePull()。",
    importance: 0.58,
  }),

  node({
    id: "hublink.domain",
    type: "part",
    title: "domain",
    summary: "src/domain。不依赖页面和数据库。类型、连接、阅览的登记，以及过滤、排序、深入和来源合并。",
    body: "页面和后台都调用这里，这里不反过来调用页面。规则的测试在 src/domain/graph.test.ts。",
    importance: 0.9,
    centrality: 0.84,
    scale: 0.48,
  }),
  node({
    id: "hublink.domain.registry",
    type: "part",
    title: "registry.ts",
    summary: "src/domain/registry.ts。登记有哪些节点类型、连接类型、度量和阅览。页面上的中文名从这里来。",
    body: "加一种读法，优先在这个文件的 views 里加一条。这一版还不能在后台里发明一种新的排法。",
    importance: 0.6,
  }),
  node({
    id: "hublink.domain.graph",
    type: "part",
    title: "graph.ts",
    summary: "src/domain/graph.ts。visibleGraph() 去掉个人点和不完整的线。rankNodes()、traverseTree()、mergeSourcePull() 也在这里。",
    body: "mergeSourcePull() 在节点已经存在时保留标题、简介、说明和可见性，只换快照。新建时说明层留空。",
    importance: 0.7,
  }),
  node({
    id: "hublink.domain.schema",
    type: "part",
    title: "schema.ts",
    summary: "src/domain/schema.ts。readNodeFields() 检查后台表单。手写的新点默认是个人，网址必须是 http 或留空。",
    body: "校验失败时动作停住，不写数据库。",
    importance: 0.48,
  }),
  node({
    id: "hublink.domain.types",
    type: "part",
    title: "types.ts",
    summary: "src/domain/types.ts。NodeRecord、EdgeRecord、SourcePull 这些类型。别的目录按这个形状传数据。",
    body: "没有运行时逻辑。改字段时，数据库读写和表单要一起改。",
    importance: 0.42,
  }),

  node({
    id: "hublink.db",
    type: "part",
    title: "db",
    summary: "src/db。SQLite 文件 data/hublink.sqlite 的读写。这个文件不进入 Git。",
    body: "listNodes(\"public\") 在 SQL 里就只读公开点。listEdges(\"public\") 要求线的两端都公开。首次连接数据库时补上这套种子。",
    importance: 0.8,
    centrality: 0.7,
    scale: 0.4,
  }),
  node({
    id: "hublink.db.store",
    type: "part",
    title: "store.ts",
    summary: "src/db/store.ts。listNodes()、listEdges()、createNode()、updateNode()、setVisibility()。",
    body: "连接是进程里的一个单例。表有 nodes、edges、node_categories。删掉一个点时，连着它的线一起删。",
    importance: 0.62,
  }),
  node({
    id: "hublink.db.seed",
    type: "part",
    title: "ensure-hublink",
    summary: "src/db/ensure-hublink.ts。ensureHublinkSeed() 按 src/content/hublink.ts 写入这张内部图。",
    body: "meta 表里记着种子版本。版本变了，就删掉 id 以 hublink 开头的旧点，再按文件重写。版本没变时，后台改过的字留着；缺了的编号会补回。",
    importance: 0.5,
  }),

  node({
    id: "hublink.lib",
    type: "part",
    title: "lib",
    summary: "src/lib。页面和后台共用的函数：GitHub 拉取、登录会话、节点图的数据和中文标签。",
    body: "它们不渲染页面。github.ts 只谈 GitHub 的 HTTP。session.ts 只谈 cookie。network.ts 只把点和线收成画布要的数组。",
    importance: 0.66,
    centrality: 0.5,
    scale: 0.32,
  }),
  node({
    id: "hublink.lib.github",
    type: "part",
    title: "github.ts",
    summary: "src/lib/github.ts。pullGithubRepo() 走官方接口，取名称、简介、语言、星标、一段 README 摘录和根目录。",
    body: "摘录最长约 480 字，根目录最多 30 条，只放进快照。私有仓库需要环境变量 GITHUB_TOKEN。错误信息里不带回令牌。",
    importance: 0.52,
  }),
  node({
    id: "hublink.lib.session",
    type: "part",
    title: "session.ts",
    summary: "src/lib/session.ts。isAdmin() 验 cookie。passwordMatches() 对口令做摘要再比较。setAdminCookie() 在登录成功后写入。",
    body: "没设置 ADMIN_PASSWORD 且不是生产环境时，开发口令是 dev-hublink-admin。正式运行必须另设口令。",
    importance: 0.48,
  }),
  node({
    id: "hublink.lib.network",
    type: "part",
    title: "network.ts",
    summary: "src/lib/network.ts。toNetworkData() 把点和线收成画布用的数组，并数每个点连着几条线。",
    body: "服务端页面可以调用它。真正画圆的组件在 src/components/network-graph.tsx。",
    importance: 0.46,
  }),
  node({
    id: "hublink.lib.present",
    type: "part",
    title: "present.ts",
    summary: "src/lib/present.ts。typeLabel()、whenLabel() 把登记表里的 id 换成页面上的中文。",
    body: "不决定一个点能不能被看见。那是 listNodes() 和 visibleGraph() 的事。",
    importance: 0.36,
  }),

  node({
    id: "hublink.canvas",
    type: "part",
    title: "components",
    summary: "src/components。浏览器里的交互：力导向节点图、三维网格、后台表单。",
    body: "节点图用 d3-force 排布，点选后只突出直接相连的圆。三维网格用 three，名字放在画布下面，不放进 WebGL 的浮层。",
    importance: 0.74,
    centrality: 0.6,
    scale: 0.36,
  }),
  node({
    id: "hublink.canvas.network",
    type: "part",
    title: "NetworkGraph",
    summary: "src/components/network-graph.tsx。NetworkGraph 按目录把圆涂成一簇，名字写在大圆里。",
    body: "同一目录的文件用同一种颜色。拖动能暂时拉开挤在一起的圆。选中时画出黄圈，并标上「直接相连」。",
    importance: 0.56,
  }),
  node({
    id: "hublink.canvas.axis",
    type: "part",
    title: "axis",
    summary: "src/components/axis-view.tsx 和 axis-canvas.tsx。三维网格只画球和轴线，标题用画布下面的链接。",
    body: "轴的名字来自阅览配置，默认是时间、重要性和个人关联度。没填的数字靠在起点。",
    importance: 0.4,
  }),
  node({
    id: "hublink.canvas.form",
    type: "part",
    title: "node-form",
    summary: "src/components/node-form.tsx。后台编辑一个点的表单，字段交给 saveNode()。",
    body: "按钮和输入来自 shadcn。表单不自己写数据库。",
    importance: 0.36,
  }),

  node({
    id: "hublink.read",
    type: "flow",
    title: "读取",
    summary: "一次公开阅读的调用顺序。从页面进入，到 listNodes()、visibleGraph()、toNetworkData()，再到 NetworkGraph。",
    body: "这条线不复制文件里的字，只标明函数谁调用谁。个人点在 listNodes(\"public\") 就离开，后面的排法看不到它们。",
    importance: 0.7,
    centrality: 0.62,
  }),
  node({
    id: "hublink.write",
    type: "flow",
    title: "写入",
    summary: "一次后台保存的调用顺序。isAdmin() 通过之后，saveNode() 用 readNodeFields() 检查，再 createNode() 或 updateNode()。",
    body: "改可见性是 setVisibility()，不走这条保存链。两条都从 actions.ts 出去，都先确认登录。",
    importance: 0.64,
    centrality: 0.5,
  }),
  node({
    id: "hublink.pull",
    type: "flow",
    title: "拉取",
    summary: "从 GitHub 拉一个仓库的调用顺序。pullRepository() 调用 pullGithubRepo()，再 mergeSourcePull()，最后写入 store.ts。",
    body: "新建时用仓库名和简介填标题和识别层，说明留空。仓库已有对应点时，不改你写过的正文和公开状态，只换快照。",
    importance: 0.58,
    centrality: 0.45,
  }),
];

export const hublinkEdges: HublinkEdge[] = [
  edge("hublink", "hublink.readme", "contains", 1),
  edge("hublink", "hublink.app", "contains", 2),
  edge("hublink", "hublink.domain", "contains", 3),
  edge("hublink", "hublink.db", "contains", 4),
  edge("hublink", "hublink.lib", "contains", 5),
  edge("hublink", "hublink.read", "contains", 6),
  edge("hublink", "hublink.write", "contains", 7),
  edge("hublink", "hublink.canvas", "contains", 8),
  edge("hublink", "hublink.pull", "contains", 9),

  edge("hublink.readme", "hublink.readme.docs", "contains", 1),

  edge("hublink.app", "hublink.app.page", "contains", 1),
  edge("hublink.app", "hublink.app.view", "contains", 2),
  edge("hublink.app", "hublink.app.node", "contains", 3),
  edge("hublink.app", "hublink.app.route", "contains", 4),
  edge("hublink.app", "hublink.app.actions", "contains", 5),

  edge("hublink.domain", "hublink.domain.registry", "contains", 1),
  edge("hublink.domain", "hublink.domain.graph", "contains", 2),
  edge("hublink.domain", "hublink.domain.schema", "contains", 3),
  edge("hublink.domain", "hublink.domain.types", "contains", 4),

  edge("hublink.db", "hublink.db.store", "contains", 1),
  edge("hublink.db", "hublink.db.seed", "contains", 2),

  edge("hublink.lib", "hublink.lib.github", "contains", 1),
  edge("hublink.lib", "hublink.lib.session", "contains", 2),
  edge("hublink.lib", "hublink.lib.network", "contains", 3),
  edge("hublink.lib", "hublink.lib.present", "contains", 4),

  edge("hublink.canvas", "hublink.canvas.network", "contains", 1),
  edge("hublink.canvas", "hublink.canvas.axis", "contains", 2),
  edge("hublink.canvas", "hublink.canvas.form", "contains", 3),

  edge("hublink.app", "hublink.domain", "depends_on", 1),
  edge("hublink.app", "hublink.db", "depends_on", 2),
  edge("hublink.app", "hublink.lib", "depends_on", 3),
  edge("hublink.app", "hublink.canvas", "depends_on", 4),
  edge("hublink.lib", "hublink.domain", "depends_on", 1),
  edge("hublink.canvas", "hublink.domain", "depends_on", 1),
  edge("hublink.read", "hublink.app.page", "step", 1),
  edge("hublink.app.page", "hublink.db.store", "step", 1),
  edge("hublink.app.page", "hublink.domain.graph", "step", 2),
  edge("hublink.app.page", "hublink.lib.network", "step", 3),
  edge("hublink.app.page", "hublink.canvas.network", "step", 4),

  edge("hublink.write", "hublink.app.actions", "step", 1),
  edge("hublink.app.actions", "hublink.lib.session", "step", 1),
  edge("hublink.app.actions", "hublink.domain.schema", "step", 2),
  edge("hublink.app.actions", "hublink.db.store", "step", 3),

  edge("hublink.pull", "hublink.app.actions", "step", 1),
  edge("hublink.app.actions", "hublink.lib.github", "step", 4),
  edge("hublink.app.actions", "hublink.domain.graph", "step", 5),
];

function edge(sourceId: string, targetId: string, type: string, sortOrder: number): HublinkEdge {
  return { id: `edge.${sourceId}.${type}.${targetId}`, sourceId, targetId, type, sortOrder };
}
