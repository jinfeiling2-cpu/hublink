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
    importance: 0.5,
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
    summary: "用一张图介绍一个人。各种页面只是不同的看法。这个点讲的是本网站自己：框架怎么搭、一次访问怎么走，以及哪里还留着空。",
    body: `这个网站用来让别人认识一个人。有人只停留十几秒，有人想看一件工作里面怎么搭、怎么运转，有人想按时间或重要性把事情排开。这些看法共用一张图，而不是各写一份材料。

图上的一个点，可以是人、项目、经历或账号，也可以是项目里面的一块结构、一步运行、一个已经定下的选择。线从起点指向终点，说明谁包含谁、谁离不开谁、谁把结果交给谁、事情按什么顺序发生。

你正在读的就是这张图里的第一个项目：网站自己。下面七块里，前六块是已经做成的框架和一次访问。最后一块「留白」空着，等以后的优化和其他内容挂上来。

规则写在代码里，内容写在本机数据库里。数据库不进入 Git。后台改过的字会留下来；只有某个点被删掉、编号不见了，下次启动才会按原文补回。`,
    role: "构建",
    outcome: "阅读、后台和公开范围已经能用。其他经历、作品和以后的优化还没有放进来。",
    status: "exploring",
    scale: 0.45,
    importance: 0.9,
    centrality: 0.85,
    categoryIds: ["activity.making", "artifact.system", "scope.personal", "stance.lead"],
  }),

  node({
    id: "hublink.views",
    type: "part",
    title: "四种看法",
    summary: "读者打开的不是四份各写各的简历，而是四种把同一张图排开的方法。",
    body: `固定的一页用来十几秒认识一个人。按时间、重要性、规模、联系或类别排列，是同一批点换一个顺序。三维网格把三个数字当成三根轴，可以转动。沿着线往下走，就是你现在用来读这个项目的方式。

看法自己不保存另一份正文。它只决定展示到哪一层、沿着哪些线走。程序里，四种排法登记在 src/domain/registry.ts，页面在 src/app/view/[id]/page.tsx，挑点和排序在 src/domain/graph.ts。`,
    importance: 0.7,
  }),
  node({
    id: "hublink.views.impression",
    type: "part",
    title: "十几秒印象",
    summary: "只留下最靠前的几句：一个人、少数方向、少数项目、近几段经历。某一类还没有点，那一栏就空着。",
    body: "人按亲疏取一个，方向按亲疏取三个，项目按重要性取三个，经历按时间取最近四段。这一页只用每个点的简介，不展开内部。",
  }),
  node({
    id: "hublink.views.rank",
    type: "part",
    title: "按数字排列",
    summary: "把公开的点排成一列，或按活动种类分组。顺序来自时间、重要性、规模或连线多少。",
    body: "没有填写时间的点会排到最后，不会被当成最早或最晚。一个点可以同时属于几类，于是在分组里出现不止一次。",
  }),
  node({
    id: "hublink.views.space",
    type: "part",
    title: "三维网格",
    summary: "横轴、纵轴和深轴各选一个数字，点就落在这个空间里。可以转动，看谁挤在一起、谁独自待着。",
    body: "名字不画在格子里面，列在画布下面，点名字就能进入那个点。没填的数字靠在起点。",
  }),
  node({
    id: "hublink.views.traverse",
    type: "part",
    title: "沿着线读内部",
    summary: "从项目、经历或账号出发，只沿允许的线往下走。读懂一件工作怎么搭，用的就是这种看法。",
    body: "项目允许的线是：包含、依赖、供给、下一步、引出。这条线走得太深会被截断。讲解本网站时，深度放宽到能看完下面这张内部图。",
  }),

  node({
    id: "hublink.graph",
    type: "part",
    title: "一张图",
    summary: "要给人看的内容都写成点和线。换一种看法，只改变排法，不另抄一份正文。",
    body: "点存在 data/hublink.sqlite，读写在 src/db/store.ts。这文件不提交到仓库。线都有方向，从起点指向终点。",
    importance: 0.8,
    scale: 0.5,
  }),
  node({
    id: "hublink.graph.registry",
    type: "part",
    title: "登记表",
    summary: "有哪些种类的点、哪些种类的线、哪些阅览，写在代码的一张表里。图上的字依赖这张表才有固定的意思。",
    body: "文件是 src/domain/registry.ts。加一种新的读法，优先往这张表加一条。这一版还不能在后台里发明一种全新的排法。",
  }),
  node({
    id: "hublink.graph.layers",
    type: "part",
    title: "一个点上的五层",
    summary: "由浅到深：用来摆放的数字、一两句简介、一段说明、内部的子点、离开这里的链接。某一层可以空着。",
    body: "简介给只扫一眼的人。说明给想知道来龙去脉的人。内部不写成一篇长文，而是下一层点。链接留给仓库、文章或演示，等读者已经明白再出去。",
  }),
  node({
    id: "hublink.graph.edges",
    type: "part",
    title: "线在说什么",
    summary: "线分四组：谁包含谁，谁证明谁，事情怎么前后相续，以及哪个外部对象本身也是一个点。",
    body: "包含、依赖、供给、下一步，用来讲结构怎么搭、运行怎么走。体现、证明、产出、记录，用来讲凭据。发生于、所属、一起、引出，用来讲经历。普通网址不是线，写在点的出口上。",
  }),
  node({
    id: "hublink.graph.measures",
    type: "part",
    title: "摆放用的数字",
    summary: "时间、规模、重要性、亲疏由人来填。联系是算出来的，等于这个点连着多少条线。",
    body: "规模和重要性不是星标，也不从仓库自动换算。排序和三维网格只用这些数字。",
  }),
  node({
    id: "hublink.graph.decision",
    type: "decision",
    title: "正文写在这张图里",
    summary: "仓库和社交平台只作出口。架构、运行和自己的说明写在这里，不从外部正文自动搬过来。",
    body: "这是已经定下的做法。以后若改主意，新增一个决策点，挂在受影响的那一块上。不要改写这个点，把旧决定涂掉。",
    importance: 0.7,
  }),

  node({
    id: "hublink.visibility",
    type: "part",
    title: "谁能看见",
    summary: "每个点标着公开或个人。读者能打开的页面，先拿掉个人的点，以及任何一端碰着它们的线。",
    body: "公开接口同样只返回公开的点。个人内容留在数据库里。公开页面查询时就只读公开的点，避免整张表被带进页面。",
    importance: 0.75,
  }),
  node({
    id: "hublink.visibility.default",
    type: "part",
    title: "手写先放在个人",
    summary: "新写下的点默认是个人。改成公开之后，读者才看得见。草稿不会一保存就出现在主页上。",
    body: "",
  }),
  node({
    id: "hublink.visibility.github",
    type: "part",
    title: "仓库另算",
    summary: "第一次拉一个 GitHub 仓库时，公开仓库变成公开的点，私有仓库变成个人的点。再拉一次，不改你写过的话，也不改可见性。",
    body: "改动的只是核对用的快照：语言、最近更新、星标，以及留在后台的一段摘录。",
  }),
  node({
    id: "hublink.visibility.decision",
    type: "decision",
    title: "个人点不进公开页",
    summary: "标成个人的点，读者打不开，公开的图里也没有它。",
    body: "这是阅读端的规则。它不是把一段文字藏进一个公开仓库里再指望别人不看源文件。",
  }),

  node({
    id: "hublink.visit",
    type: "part",
    title: "一次访问",
    summary: "从打开一种看法，到看见一个点，中间只有四步。没有登录，也没有另一套藏起来的正文。",
    body: "下面四步按「下一步」串起来。每一步的简介就是这一步对读者发生的事。",
    importance: 0.7,
  }),
  node({
    id: "hublink.visit.choose",
    type: "flow",
    title: "选一种看法",
    summary: "读者在入口点一种阅览，例如按时间，或沿着线读项目内部。",
    body: "入口页把登记表里的阅览列出来。点进去之后，地址里的名字决定用哪一种排法。",
  }),
  node({
    id: "hublink.visit.filter",
    type: "flow",
    title: "只留下公开的",
    summary: "个人的点在这一步离开。后面的排序、网格和深入都看不到它们。",
    body: "数据库查询就带上「只读公开」。两端不是都公开的线，一并离开。",
  }),
  node({
    id: "hublink.visit.arrange",
    type: "flow",
    title: "按这种看法排布",
    summary: "印象页挑少数几句，列表按数字排序，网格把数字换成位置，深入则沿着线往下走。",
    body: "排法不改点上的字。同一个项目，在印象里是一句简介，在深入里是一棵内部的图。",
  }),
  node({
    id: "hublink.visit.open",
    type: "flow",
    title: "点进一个点",
    summary: "这里能看见简介、说明、连出去的下一层，以及出口。想看仓库或原文，从出口离开。",
    body: "说明是写给读者的正文。快照里的星标和语言只是底部的一行核对，不是这篇说明。",
  }),

  node({
    id: "hublink.admin",
    type: "part",
    title: "后台",
    summary: "登录之后才能改图。加上一个点、拉一条线、把个人改成公开，读者下一次打开就会看到。",
    body: "入口是 /admin。开发时若没有另设口令，使用 dev-hublink-admin。正式运行要设置 ADMIN_PASSWORD。读取私有仓库还需要 GITHUB_TOKEN。这些口令不放进仓库。",
    importance: 0.6,
  }),
  node({
    id: "hublink.admin.write",
    type: "part",
    title: "改的是图，不是页面",
    summary: "保存一个点，就是写进数据库。四种看法没有各自的稿子，所以不用改四遍。",
    body: "程序在 src/app/admin。保存时保留这个点已有的来源快照，不会把核对信息清掉。",
  }),
  node({
    id: "hublink.admin.keep",
    type: "part",
    title: "再拉取不覆盖正文",
    summary: "从 GitHub 更新一个已经存在的点时，标题、简介、说明和公开状态保持不动，只换掉快照。",
    body: "新建的那一次才会用仓库名和仓库简介填上标题和简介，说明层留空，等你自己写。",
  }),

  node({
    id: "hublink.sources",
    type: "part",
    title: "外面的材料",
    summary: "代码和笔记仍在原处。这里只收一小条核对信息，或者你自己写下的说明。",
    body: "能自动拿到的，是出口和核对。读者要读的架构和运行，仍是这张图里的点。",
    importance: 0.55,
  }),
  node({
    id: "hublink.sources.github",
    type: "part",
    title: "GitHub 只收薄信息",
    summary: "能拉来名称、简介、语言、时间和星标，外加一段摘录和根目录。摘录只留在后台，不写进说明，也不给读者的接口。",
    body: "拉取在 src/lib/github.ts。合并规则保证摘录进不了说明层。私有仓库需要只读令牌，并且默认放在个人一侧。",
  }),
  node({
    id: "hublink.sources.manual",
    type: "part",
    title: "没有接口就手写",
    summary: "小红书还不能拉取笔记和图片。账号只登记主页和你写的一句说明；重要的笔记要另建成条目。",
    body: "官方接口尚未开放读取笔记，所以不用不稳定的采集来充数。以后若能正式读取，接到同一种来源上即可，不用改这张图的形状。",
  }),

  node({
    id: "hublink.room",
    type: "part",
    title: "留白",
    summary: "这一支故意留着。以后的优化、还没写的经历和其他作品，建成新的点挂在这里，或挂到它真正改动的那一块旁边。",
    body: `不要往这里填还没发生的成果。适合以后挂上来的，是其他项目、一段经历、一次把某个部分改得更好的决策、笔记的正式拉取，以及一个别人一直能打开的网址。

优化请新建决策点或架构部分，用「包含」或「引出」连到留白，或者连到被改动的那一块。不要把新结论写进旧的决策里。`,
    importance: 0.4,
    centrality: 0.2,
  }),
  node({
    id: "hublink.room.open",
    type: "part",
    title: "还没放进来的位置",
    summary: "其他项目、个人经历、后续优化的决策、笔记同步、长期公开的网址。这些位置空着，等有结果再建成点。",
    body: "这一支下面现在只有这句话，用来标出空位。新的点加上之后，这句话可以留着，也可以改成一份清单。",
    importance: 0.2,
    centrality: 0.1,
  }),
];

export const hublinkEdges: HublinkEdge[] = [
  edge("hublink", "hublink.views", "contains", 1),
  edge("hublink", "hublink.graph", "contains", 2),
  edge("hublink", "hublink.visibility", "contains", 3),
  edge("hublink", "hublink.visit", "contains", 4),
  edge("hublink", "hublink.admin", "contains", 5),
  edge("hublink", "hublink.sources", "contains", 6),
  edge("hublink", "hublink.room", "contains", 7),

  edge("hublink.views", "hublink.views.impression", "contains", 1),
  edge("hublink.views", "hublink.views.rank", "contains", 2),
  edge("hublink.views", "hublink.views.space", "contains", 3),
  edge("hublink.views", "hublink.views.traverse", "contains", 4),
  edge("hublink.views", "hublink.visibility", "depends_on", 1),

  edge("hublink.graph", "hublink.graph.registry", "contains", 1),
  edge("hublink.graph", "hublink.graph.layers", "contains", 2),
  edge("hublink.graph", "hublink.graph.edges", "contains", 3),
  edge("hublink.graph", "hublink.graph.measures", "contains", 4),
  edge("hublink.graph", "hublink.graph.decision", "contains", 5),
  edge("hublink.graph", "hublink.graph.registry", "depends_on", 1),

  edge("hublink.visibility", "hublink.visibility.default", "contains", 1),
  edge("hublink.visibility", "hublink.visibility.github", "contains", 2),
  edge("hublink.visibility", "hublink.visibility.decision", "contains", 3),
  edge("hublink.visibility", "hublink.graph", "depends_on", 1),
  edge("hublink.visibility", "hublink.visit", "feeds", 1),

  edge("hublink.visit", "hublink.visit.choose", "step", 1),
  edge("hublink.visit.choose", "hublink.visit.filter", "step", 2),
  edge("hublink.visit.filter", "hublink.visit.arrange", "step", 3),
  edge("hublink.visit.arrange", "hublink.visit.open", "step", 4),

  edge("hublink.admin", "hublink.admin.write", "contains", 1),
  edge("hublink.admin", "hublink.admin.keep", "contains", 2),
  edge("hublink.admin", "hublink.graph", "feeds", 1),

  edge("hublink.sources", "hublink.sources.github", "contains", 1),
  edge("hublink.sources", "hublink.sources.manual", "contains", 2),
  edge("hublink.sources", "hublink.graph", "feeds", 1),

  edge("hublink.room", "hublink.room.open", "contains", 1),
];

function edge(sourceId: string, targetId: string, type: string, sortOrder: number): HublinkEdge {
  return { id: `edge.${sourceId}.${type}.${targetId}`, sourceId, targetId, type, sortOrder };
}
