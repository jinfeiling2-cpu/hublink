import type { EdgeGroup, LayerId, MeasureKey } from "./types";

export type LayerDefinition = {
  id: LayerId;
  label: string;
  description: string;
};

export type NodeTypeDefinition = {
  id: string;
  label: string;
  description: string;
  layers: LayerId[];
  childEdgeTypes: string[];
};

export type EdgeTypeDefinition = {
  id: string;
  label: string;
  group: EdgeGroup;
  description: string;
  ordered: boolean;
};

export type DimensionDefinition = {
  id: string;
  kind: "measure" | "category";
  group?: string;
  label: string;
  description: string;
};

export type RankConfig = {
  measure: MeasureKey;
  direction?: "asc" | "desc";
  groupBy?: string;
};

export type AxisConfig = {
  x: MeasureKey;
  y: MeasureKey;
  z: MeasureKey;
};

export type TemplateConfig = {
  template: "impression";
};

export type TraverseConfig = {
  rootType: string;
  edgeTypes: string[];
  maxDepth: number;
};

export type NetworkConfig = {
  sizeBy: "importance" | "centrality" | "degree";
};

export type ViewDefinition = {
  id: string;
  name: string;
  question: string;
  kind: "network" | "rank" | "axis3" | "template" | "traverse";
  config: NetworkConfig | RankConfig | AxisConfig | TemplateConfig | TraverseConfig;
};

export type SourceAdapterDefinition = {
  id: string;
  label: string;
  canPullMetadata: boolean;
  canPullNotes: boolean;
  canPullPrivate: boolean;
  summary: string;
};

export type StatusDefinition = {
  id: string;
  label: string;
};

export const layers: LayerDefinition[] = [
  {
    id: "placement",
    label: "摆放",
    description: "标题、类型、时间、规模、重要性、个人关联度、公开或个人。列表、排序和三维网格只用这一层。",
  },
  {
    id: "recognition",
    label: "识别",
    description: "一两句精确简介，加上角色和结果。简历式浏览停在这里仍然完整。",
  },
  {
    id: "account",
    label: "说明",
    description: "问题、做法、结果，或一段经历的情境与实际工作。这是总览相对外部网站多出来的正文。",
  },
  {
    id: "internal",
    label: "内部",
    description: "沿着连接展开的结构、运行、决策或阶段。项目的架构在这里，不在仓库的目录树里。",
  },
  {
    id: "exit",
    label: "出口",
    description: "主链接和深链。读者形成内部图景之后，从这里去看公开原文。",
  },
];

export const nodeTypes: NodeTypeDefinition[] = [
  {
    id: "person",
    label: "人",
    description: "主页介绍的对象。可以连接到方向、项目、经历、账号和其他作品。",
    layers: ["placement", "recognition", "account", "exit"],
    childEdgeTypes: ["contains"],
  },
  {
    id: "direction",
    label: "方向",
    description: "持续追问的问题。项目用「体现」连到这里，读者可以顺着一条线索看下去。",
    layers: ["placement", "recognition", "account"],
    childEdgeTypes: [],
  },
  {
    id: "goal",
    label: "目标",
    description: "希望通过一组工作逐步达到的状态。项目或方向可以用「实现」或「引出」连到这里。",
    layers: ["placement", "recognition", "account", "internal"],
    childEdgeTypes: ["contains", "leads_to"],
  },
  {
    id: "project",
    label: "项目",
    description: "一件工作。识别层给简历式阅读，内部层展开架构和运行，出口再指向仓库。",
    layers: ["placement", "recognition", "account", "internal", "exit"],
    childEdgeTypes: ["contains", "depends_on", "feeds", "step", "leads_to"],
  },
  {
    id: "concept",
    label: "思路要点",
    description: "一个可独立解释的问题、机制、主题或论证。用于拆解研究思路、游戏构思与世界观。",
    layers: ["placement", "recognition", "account", "internal"],
    childEdgeTypes: ["contains", "related_to", "contributes_to"],
  },
  {
    id: "part",
    label: "项目内部分支",
    description: "按项目本身的结构拆出的一块内容，可以是问题、机制、阶段、决策、实现模块或叙事单元，不预设为代码目录。",
    layers: ["placement", "recognition", "account", "internal", "exit"],
    childEdgeTypes: ["contains", "depends_on", "feeds", "step", "leads_to", "related_to"],
  },
  {
    id: "contribution",
    label: "个人贡献",
    description: "一个人在项目、经历或作品中承担的行动；必须独立记录个人归属核对状态，不等同于项目组成部分。",
    layers: ["placement", "recognition", "account", "exit"],
    childEdgeTypes: ["contribution_to"],
  },
  {
    id: "flow",
    label: "运行步骤",
    description: "事情运转时的一步，按顺序连接。描述的是运行方式，不是文件夹名称。",
    layers: ["placement", "recognition", "account", "exit"],
    childEdgeTypes: ["step"],
  },
  {
    id: "decision",
    label: "决策",
    description: "一个选择、放弃了什么、带来什么后果。想深入的读者才需要走进来。",
    layers: ["placement", "recognition", "account"],
    childEdgeTypes: [],
  },
  {
    id: "experience",
    label: "经历",
    description: "一段有时间范围的工作或学习。内部可以拆成片段，并产出项目。",
    layers: ["placement", "recognition", "account", "internal", "exit"],
    childEdgeTypes: ["contains", "produced", "leads_to"],
  },
  {
    id: "episode",
    label: "经历片段",
    description: "经历里面的一次转折、一次发布或一段职责。",
    layers: ["placement", "recognition", "account", "exit"],
    childEdgeTypes: ["produced", "leads_to"],
  },
  {
    id: "social_account",
    label: "社交账号",
    description: "某个平台上的公开身份。以图片为主时，识别层和主页链接就够了。",
    layers: ["placement", "recognition", "exit"],
    childEdgeTypes: ["contains"],
  },
  {
    id: "entry",
    label: "条目",
    description: "被选中的一条笔记、文章或发言。重要时写明它主张什么，再链回原平台。",
    layers: ["placement", "recognition", "account", "exit"],
    childEdgeTypes: ["contains", "documents"],
  },
  {
    id: "photo",
    label: "照片",
    description: "条目下的一张图。不在这里做照片墙。",
    layers: ["placement", "recognition", "exit"],
    childEdgeTypes: [],
  },
  {
    id: "organization",
    label: "组织",
    description: "经历所在的机构、团队或场所。",
    layers: ["placement", "recognition", "exit"],
    childEdgeTypes: [],
  },
  {
    id: "collaborator",
    label: "协作者",
    description: "一起完成某件工作的人。",
    layers: ["placement", "recognition", "exit"],
    childEdgeTypes: [],
  },
  {
    id: "capacity",
    label: "能力",
    description: "一件工作或一段经历所能证明的能力。证据用「证明」连过来。",
    layers: ["placement", "recognition"],
    childEdgeTypes: [],
  },
];

export const edgeTypes: EdgeTypeDefinition[] = [
  {
    id: "related_to",
    label: "主题关联",
    group: "course",
    description: "两项内容共享一个明确问题或结构；写清依据。不表示依赖、因果、作者意图或已经发生的方法迁移。",
    ordered: false,
  },
  {
    id: "contributes_to",
    label: "服务于",
    group: "evidence",
    description: "一项工作或思路可服务于某个目标。需要写明作用与依据，不表示目标已达成。",
    ordered: false,
  },
  {
    id: "informs",
    label: "为工作画像提供材料",
    group: "evidence",
    description: "一项已有记录为工作画像或综合解释提供材料；说明它为何进入这项理解，不表示单条材料能够证明完整身份。",
    ordered: false,
  },
  {
    id: "contains",
    label: "包含",
    group: "composition",
    description: "整体指向它的一部分。项目包含架构部分，经历包含片段，账号包含条目。",
    ordered: true,
  },
  {
    id: "implements",
    label: "实现",
    group: "composition",
    description: "一项工作或内部部分已经落实某个明确功能或接口；目标性、计划性贡献应使用「服务于」。",
    ordered: false,
  },
  {
    id: "depends_on",
    label: "依赖",
    group: "composition",
    description: "架构上，这一块离不开那一块。",
    ordered: false,
  },
  {
    id: "feeds",
    label: "供给",
    group: "composition",
    description: "运行中，这一块把结果交给那一块。",
    ordered: false,
  },
  {
    id: "step",
    label: "下一步",
    group: "composition",
    description: "运行顺序。按序号排列。",
    ordered: true,
  },
  {
    id: "embodies",
    label: "体现",
    group: "evidence",
    description: "内容直接呈现某个方向的具体问题或机制；仅共享主题时使用「主题关联」。",
    ordered: false,
  },
  {
    id: "demonstrates",
    label: "证明",
    group: "evidence",
    description: "项目或经历证明某种能力。",
    ordered: false,
  },
  {
    id: "produced",
    label: "产出",
    group: "evidence",
    description: "经历或片段产出了某个项目、文本或其他节点。",
    ordered: false,
  },
  {
    id: "contribution_to",
    label: "贡献于",
    group: "evidence",
    description: "一条个人贡献记录属于某个项目、经历或作品；关系本身不证明该贡献的个人归属已核验。",
    ordered: true,
  },
  {
    id: "documents",
    label: "记录",
    group: "evidence",
    description: "一条公开条目记录了某个项目或某段经历。",
    ordered: false,
  },
  {
    id: "during",
    label: "发生于",
    group: "course",
    description: "项目落在某段经历的时间里。这是归属，不只是日期相近。",
    ordered: false,
  },
  {
    id: "at",
    label: "所属",
    group: "course",
    description: "经历指向它所在的组织。",
    ordered: false,
  },
  {
    id: "with",
    label: "与…一起",
    group: "course",
    description: "工作和协作者之间的关系。",
    ordered: false,
  },
  {
    id: "leads_to",
    label: "引出",
    group: "course",
    description: "有材料支持的因果或实际发展关系，而非时间先后、相似主题或可能贡献。",
    ordered: true,
  },
  {
    id: "canonical",
    label: "来源",
    group: "source",
    description: "指向图里的另一个节点，表示它是外部原文所对应的对象。普通链接放在出口字段上。",
    ordered: false,
  },
];

export const measures: DimensionDefinition[] = [
  { id: "time", kind: "measure", label: "时间", description: "节点上的起始时间。项目和经历用时间段，决策和条目用时间点。" },
  { id: "scale", kind: "measure", label: "规模", description: "这件事情的体量。由你判断，不从星标数换算。" },
  { id: "importance", kind: "measure", label: "重要性", description: "它在你的工作里有多重。" },
  { id: "centrality", kind: "measure", label: "个人关联度", description: "它与你的经历、工作主线和方向关联得有多紧，由你判断，不按连线数量计算。" },
  { id: "degree", kind: "measure", label: "联系", description: "与它相连的公开连线数量，由图算出来。" },
];

export const categories: DimensionDefinition[] = [
  { id: "activity.making", kind: "category", group: "activity", label: "制作", description: "把东西做出来。" },
  { id: "activity.research", kind: "category", group: "activity", label: "研究", description: "把问题弄清楚。" },
  { id: "activity.writing", kind: "category", group: "activity", label: "写作", description: "把认识写成可以阅读的文本。" },
  { id: "activity.organizing", kind: "category", group: "activity", label: "组织", description: "把人和过程组织起来。" },
  { id: "activity.teaching", kind: "category", group: "activity", label: "教学", description: "让别人能够进入这件事。" },
  { id: "artifact.product", kind: "category", group: "artifact", label: "产品", description: "给人使用的成品。" },
  { id: "artifact.tool", kind: "category", group: "artifact", label: "工具", description: "用来完成别的工作的器具。" },
  { id: "artifact.system", kind: "category", group: "artifact", label: "系统", description: "由多块结构一起运转的整体。" },
  { id: "artifact.text", kind: "category", group: "artifact", label: "文本", description: "文章、文档、论文。" },
  { id: "artifact.talk", kind: "category", group: "artifact", label: "谈话", description: "演讲、分享、对话。" },
  { id: "scope.personal", kind: "category", group: "scope", label: "个人", description: "一个人完成。" },
  { id: "scope.team", kind: "category", group: "scope", label: "团队", description: "一小群人一起完成。" },
  { id: "scope.institution", kind: "category", group: "scope", label: "机构", description: "在组织制度里完成。" },
  { id: "scope.public", kind: "category", group: "scope", label: "公开", description: "面向公众。" },
  { id: "stance.lead", kind: "category", group: "stance", label: "主导", description: "你对结果负责。" },
  { id: "stance.contributor", kind: "category", group: "stance", label: "参与", description: "你完成其中一部分。" },
  { id: "stance.independent", kind: "category", group: "stance", label: "独立", description: "没有所属团队的个人工作。" },
];

export const categoryGroups: { id: string; label: string }[] = [
  { id: "activity", label: "活动种类" },
  { id: "artifact", label: "成果形态" },
  { id: "scope", label: "范围" },
  { id: "stance", label: "所处位置" },
];

export const dimensions: DimensionDefinition[] = [...measures, ...categories];

export const statuses: StatusDefinition[] = [
  { id: "exploring", label: "探索中" },
  { id: "shipped", label: "已发布" },
  { id: "maintained", label: "维护中" },
  { id: "closed", label: "已结束" },
];

export const views: ViewDefinition[] = [
  {
    id: "network",
    name: "节点图",
    question: "这些点怎样连在一起，哪些是枢纽，哪些聚成一簇？",
    kind: "network",
    config: { sizeBy: "importance" },
  },
  {
    id: "impression",
    name: "30 秒认识",
    question: "先看个人核心诉求与思考，再看方向、代表项目和经历。",
    kind: "template",
    config: { template: "impression" },
  },
  {
    id: "by-time",
    name: "按时间",
    question: "这些事情沿着时间怎样排列？",
    kind: "rank",
    config: { measure: "time", direction: "desc" },
  },
  {
    id: "by-importance",
    name: "按重要性",
    question: "哪些事情在工作里更重？",
    kind: "rank",
    config: { measure: "importance", direction: "desc" },
  },
  {
    id: "by-scale",
    name: "按规模",
    question: "哪些事情的体量更大？",
    kind: "rank",
    config: { measure: "scale", direction: "desc" },
  },
  {
    id: "by-connection",
    name: "按联系",
    question: "哪些节点和别的事情缠得更紧？",
    kind: "rank",
    config: { measure: "degree", direction: "desc" },
  },
  {
    id: "by-activity",
    name: "按活动种类",
    question: "如果按制作、研究、写作这样的面来看，图会怎样分开？",
    kind: "rank",
    config: { measure: "importance", direction: "desc", groupBy: "activity" },
  },
  {
    id: "space",
    name: "三维网格",
    question: "时间、重要性和个人关联度放在一起时，哪些事情挤在一处，哪些独自待着？",
    kind: "axis3",
    config: { x: "time", y: "importance", z: "centrality" },
  },
  {
    id: "project-depth",
    name: "项目深入",
    question: "这个项目里面是怎样搭起来、又怎样运行的？",
    kind: "traverse",
    config: {
      rootType: "project",
      edgeTypes: ["contains", "depends_on", "feeds", "step", "leads_to"],
      maxDepth: 5,
    },
  },
  {
    id: "experience-depth",
    name: "经历深入",
    question: "这段经历里面发生了什么，又引出或产出了什么？",
    kind: "traverse",
    config: {
      rootType: "experience",
      edgeTypes: ["contains", "produced", "leads_to"],
      maxDepth: 3,
    },
  },
  {
    id: "social-depth",
    name: "社交深入",
    question: "这个账号里，哪些条目值得放进对这个人的理解？",
    kind: "traverse",
    config: {
      rootType: "social_account",
      edgeTypes: ["contains", "documents"],
      maxDepth: 2,
    },
  },
];

export const sourceAdapters: SourceAdapterDefinition[] = [
  {
    id: "github",
    label: "GitHub 仓库",
    canPullMetadata: true,
    canPullNotes: false,
    canPullPrivate: true,
    summary:
      "可以拉取名称、简介、语言、话题、许可证、时间、星标、根目录和一段 README 摘录。摘录只留在快照里，不写入说明层。公开仓库默认公开，私有仓库默认个人；再次同步不改写已有正文和可见性。",
  },
  {
    id: "xiaohongshu",
    label: "小红书",
    canPullMetadata: false,
    canPullNotes: false,
    canPullPrivate: false,
    summary:
      "官方接口尚未开放笔记读取，目前不能把笔记和图片拉进来。账号登记主页链接；真正要展开的笔记写成条目。公开或个人在这里决定。",
  },
  {
    id: "manual",
    label: "手写",
    canPullMetadata: false,
    canPullNotes: false,
    canPullPrivate: false,
    summary: "没有稳定接口的来源只保存你写下的内容和出口。手写节点默认是个人，确认后才公开。",
  },
];

export const measureKeys: MeasureKey[] = ["time", "scale", "importance", "centrality", "degree"];

export function nodeTypeById(id: string) {
  return nodeTypes.find((item) => item.id === id);
}

export function edgeTypeById(id: string) {
  return edgeTypes.find((item) => item.id === id);
}

export function viewById(id: string) {
  return views.find((item) => item.id === id);
}

export function measureLabel(id: MeasureKey) {
  return measures.find((item) => item.id === id)?.label ?? id;
}

export function statusLabel(id: string) {
  return statuses.find((item) => item.id === id)?.label ?? "";
}

export function isMeasureKey(value: string): value is MeasureKey {
  return measureKeys.includes(value as MeasureKey);
}
