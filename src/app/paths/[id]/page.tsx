import Link from "next/link";
import { notFound } from "next/navigation";
import { edgeTypeById } from "@/domain/registry";
import { listEdges, listNodes } from "@/db/store";
import { profile } from "@/content/profile";

export const dynamic = "force-dynamic";

const paths: Record<string, { title: string; question: string; steps: { nodeId: string; lens: string }[] }> = {
  research: { title: "研究框架深读", question: "从具体问题进入，看行动、方法与证据怎样支撑一个研究目标。顺序是阅读路径，不表示所有环节都已实现。", steps: [
    { nodeId: "direction.research-human-ai", lens: "先看研究试图理解的现实问题。" },
    { nodeId: "project.research-positioning", lens: "再区分长期研究地图与具体工作阶段。" },
    { nodeId: "part.research-doctoral-core", lens: "博士目标框架在这里作为目标，而非交付声明。" },
    { nodeId: "concept.problem-action-evidence", lens: "把情境、行动、干预与证据连接起来。" },
    { nodeId: "hublink", lens: "回到 Hublink，观察如何让来源和阅读路径可持续整理。" },
  ] },
  "creative-systems": { title: "创作中的系统思考", question: "比较创作构思如何处理信息、信任、制度、交接与代价；构思节点不等于已完成作品。", steps: [
    { nodeId: "concept.information-uncertainty-trust", lens: "先读跨作品的主题候选。" },
    { nodeId: "project.jianghu", lens: "在江湖构思中观察侦察、声誉与信任。" },
    { nodeId: "project.guantan", lens: "在怪谈模拟器中观察感知规则和交班机制。" },
    { nodeId: "concept.knowledge-handoff", lens: "再比较记录、传承和连续性。" },
    { nodeId: "project.wufang", lens: "最后看权力、身体和代价如何进入世界设定。" },
  ] },
  "building-hublink": { title: "Hublink 如何建成", question: "从阅读目的开始，沿着图谱模型、语料审核与公开机器出口检查这个原型。", steps: [
    { nodeId: "hublink", lens: "先看这个站试图解决什么阅读问题。" },
    { nodeId: "hublink.read", lens: "访客如何读取同一份图谱。" },
    { nodeId: "hublink.domain", lens: "节点、关系与维度如何表达工作内容。" },
    { nodeId: "hublink.db", lens: "正式图谱怎样存储与更新。" },
    { nodeId: "hublink.app.route", lens: "公开机器出口如何投影节点。" },
  ] },
};

export default async function ReadingPathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = paths[id];
  if (!path) notFound();
  const nodes = listNodes("public");
  const edges = listEdges("public");
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const steps = path.steps.flatMap((step) => {
    const node = byId.get(step.nodeId);
    return node ? [{ ...step, node }] : [];
  });
  if (!steps.length) notFound();
  return <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10">
    <header className="grid gap-3"><Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">返回 Hublink</Link><p className="text-sm text-muted-foreground">一条可核对的阅读路径</p><h1 className="text-4xl font-semibold tracking-tight">{path.title}</h1><p className="max-w-3xl leading-7 text-muted-foreground">{path.question}</p></header>
    {id === "research" ? <section className="grid gap-3 rounded-2xl border border-[#cbd9d2] bg-[#eff4f0] p-6"><p className="text-sm text-[#527268]">当前认可的方向与目标框架</p><h2 className="text-xl font-semibold">{profile.direction}</h2><p className="text-sm leading-7">{profile.alignmentAim}</p><p className="text-sm leading-7">博士目标框架：{profile.doctoralFramework}。</p><p className="text-sm leading-7 text-muted-foreground">这里记录目标，不据此声明整套框架已经实现。下方保留较早整理的研究路线与概念，供比较和继续核对；论文与博士的动态进度保持开放。</p><Link href="/resume" className="text-sm text-[#315c55] underline">查看当前简历整理版 →</Link></section> : null}
    {id === "building-hublink" ? <section className="grid gap-3 rounded-2xl border border-border p-6"><h2 className="text-xl font-semibold">从阅读目标进入实现</h2><p className="text-sm leading-7 text-muted-foreground">{profile.sitePurpose}</p><p className="text-sm leading-7 text-muted-foreground">当前已有公开图谱、简历、深读和 AI 出口。语料候选的审核、正式录入与显式发布仍需贯通；下方节点主要说明已有代码结构，不能代替这项建设状态。</p><div className="flex flex-wrap gap-4 text-sm text-[#315c55]"><Link href="/project/hublink" className="underline">项目职责与运行过程</Link><Link href="/ai" className="underline">机器阅读说明</Link><Link href="/api/context" className="underline">公开 JSON 上下文</Link></div></section> : null}
    {steps.length < path.steps.length ? <p className="text-sm text-muted-foreground">当前路径显示 {steps.length} / {path.steps.length} 个可公开步骤；其余步骤暂不可读，不展示私人内容。</p> : null}
    <ol className="grid gap-5 border-l-2 border-[#9eb3aa] pl-5">
      {steps.map(({ node, lens }, index) => {
        const between = index > 0 ? edges.filter((edge) => edge.sourceId === steps[index - 1].node.id && edge.targetId === node.id) : [];
        return <li key={node.id} className="relative grid gap-2 rounded-2xl border border-border bg-card p-5"><span className="absolute -left-[1.83rem] top-6 grid size-5 place-items-center rounded-full border-2 border-[#52796e] bg-background text-[10px] text-[#315c55]">{index + 1}</span><p className="text-xs text-muted-foreground">{lens}</p>{between.map((edge) => <p key={edge.id} className="text-xs text-[#55776b]">连接：{edgeTypeById(edge.type)?.label ?? edge.type}{edge.label ? ` · ${edge.label}` : ""}</p>)}<p className="text-xs text-muted-foreground">{node.type} · {node.status || "阶段未记录"}</p><h2 className="text-xl font-semibold"><Link href={`/node/${node.id}`} className="hover:underline">{node.title}</Link></h2><p className="text-sm leading-7 text-muted-foreground">{node.summary}</p>{node.body ? <p className="whitespace-pre-wrap text-sm leading-7">{node.body}</p> : null}<Link href={`/node/${node.id}`} className="w-fit text-sm text-[#315c55] underline underline-offset-4">查看节点、关系和出口 →</Link></li>;
      })}
    </ol>
    <aside className="rounded-xl bg-[#eff4f0] p-5 text-sm leading-7 text-[#536963]">阅读顺序用于帮助建立理解，不自动表示因果、完成状态或本人已确认的统一理论。核心方向：{profile.direction}。</aside>
  </main>;
}
