export const hublinkCase = {
  title: "Hublink",
  subtitle: "个人工作图谱原型",
  purpose:
    "把个人信息、方向、项目、经历、作品和社交账号放进一张可连接的图谱，再用不同阅读方式呈现它们之间的联系。",
  currentState:
    "当前仓库实现了本地可运行的 Next.js 原型，包括公开阅读页、个人管理后台、SQLite 数据、关系图和 GitHub 仓库快照同步。尚未部署成线上网站，也还没有接入托管数据库和管理员账号系统。",
  status: "原型建设中",
  architecture: [
    {
      title: "访客入口",
      description: "网页路由和 JSON 接口接收阅读请求。页面读取公开图谱，API 返回公开节点与关系。",
      files: ["src/app/page.tsx", "src/app/view/[id]/page.tsx", "src/app/node/[id]/page.tsx", "src/app/api/graph/route.ts"],
    },
    {
      title: "图谱规则",
      description: "领域代码处理公开筛选、排序、关系遍历、坐标计算和来源信息合并。页面通过这些规则读取同一份数据。",
      files: ["src/domain/registry.ts", "src/domain/graph.ts", "src/domain/schema.ts", "src/domain/types.ts"],
    },
    {
      title: "图形与内容呈现",
      description: "React 组件把固定坐标节点画成二维地图或可旋转的三维坐标，也负责显示后台表单。",
      files: ["src/components/network-graph.tsx", "src/components/spatial-canvas.tsx", "src/components/node-form.tsx"],
    },
    {
      title: "后台与数据保存",
      description: "后台操作先检查登录，再校验表单并读写 SQLite。当前数据库文件在运行应用的本地 data 目录。",
      files: ["src/app/admin/actions.ts", "src/lib/session.ts", "src/db/store.ts"],
    },
    {
      title: "外部仓库资料",
      description: "服务器向 GitHub API 请求仓库资料；同步时保留人工填写的叙述，只更新来源快照。",
      files: ["src/lib/github.ts", "src/domain/graph.ts", "src/app/admin/actions.ts"],
    },
  ],
  flows: [
    {
      title: "访客查看关系图",
      result: "浏览器得到公开节点和连接，并显示位置固定、可缩放平移或旋转探索的关系图。",
      steps: [
        "首页读取 SQLite 中公开节点与公开连接",
        "领域规则准备图数据，计算每个节点的连接数量",
        "空间布局按人物中心、领域方位与选定维度计算固定坐标",
        "地图模式缩放和平移，三维模式旋转、平移和缩放；选中节点后突出其直接关系",
      ],
      files: ["src/app/page.tsx", "src/db/store.ts", "src/domain/graph.ts", "src/lib/network.ts", "src/components/network-graph.tsx"],
    },
    {
      title: "管理员编辑节点",
      result: "通过校验的内容保存到 SQLite，页面缓存重新验证。",
      steps: [
        "后台表单提交到 saveNode",
        "server action 检查当前会话是否为管理员",
        "readNodeFields 使用 Zod 规则校验字段和链接",
        "store 创建或更新节点与类别，并重新验证页面",
      ],
      files: ["src/components/node-form.tsx", "src/app/admin/actions.ts", "src/domain/schema.ts", "src/db/store.ts"],
    },
    {
      title: "同步 GitHub 仓库",
      result: "仓库元数据和摘要保存在来源快照；已有节点的个人叙述与可见性得到保留。",
      steps: [
        "管理员提交 owner/repo 或 GitHub 仓库链接",
        "服务端请求 GitHub API 获取仓库资料、README 摘录和根目录",
        "mergeSourcePull 将来源快照与已有节点合并",
        "store 写入新节点或更新已有节点",
      ],
      files: ["src/app/admin/actions.ts", "src/lib/github.ts", "src/domain/graph.ts", "src/db/store.ts"],
    },
  ],
  learningQuestions: [
    {
      question: "访客请求页面时，为什么由服务器先读取公开节点，再把必要数据交给图形组件？",
      files: ["src/app/page.tsx", "src/db/store.ts", "src/components/network-graph.tsx"],
    },
    {
      question: "公开 / 个人状态在哪些读取路径上生效？个人节点连接到公开节点时会发生什么？",
      files: ["src/db/store.ts", "src/domain/graph.ts", "src/app/api/graph/route.ts"],
    },
    {
      question: "为什么同步仓库资料时要保留已有的人工叙述，而不是用 README 覆盖？",
      files: ["src/lib/github.ts", "src/domain/graph.ts", "src/domain/graph.test.ts"],
    },
    {
      question: "把本地 SQLite 换成线上数据库，会影响哪些读写边界？哪些页面不应该直接连接数据库？",
      files: ["src/db/store.ts", "src/app/admin/actions.ts", "src/app/api/graph/route.ts"],
    },
  ],
  confirmedWork: [
    "当前代码包含公开阅读、图谱计算、节点管理、公开范围过滤和 GitHub 仓库快照同步。",
    "领域规则、本地语料与模型模拟、审核恢复、公开上下文和固定空间布局有自动测试；验证范围不等于真实读者效果。",
  ],
  needsOwnerInput: [
    "你在目标设定、需求拆解、代码审查和实现中分别承担了什么？",
    "哪些部分是你主动选择的设计，哪些来自 AI 建议？你为什么接受或修改它们？",
    "你目前能不看代码解释哪些部分？还有哪些概念需要通过实践弄懂？",
    "有无试用者、反馈、使用数据或已达成的结果？",
  ],
} as const;
