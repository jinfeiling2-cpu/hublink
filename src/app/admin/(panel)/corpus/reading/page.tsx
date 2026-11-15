import Link from "next/link";
import { readingPaths, type CuratedSample } from "@/agents/curation";
import { buildReadingPreview } from "@/agents/reading-preview";
import { NetworkGraph } from "@/components/network-graph";
import { toNetworkData } from "@/lib/network";

export const dynamic = "force-dynamic";

const basisLabels = {
  owner_statement: "依据：本人确认",
  document_statement: "依据：底稿表述 · 原句作者待核对",
  analyst_inference: "依据：分析者推断",
};
const kindLabels = {
  confirmed: "已核验", self_reported: "本人自述", planned: "目标 / 计划", suggested: "设计建议",
  inferred: "暂定归纳", open: "开放问题", unclassified: "待归类",
};

export default function CorpusReadingPage() {
  const preview = buildReadingPreview();
  const { documents, curation } = preview.artifact;
  const nodes = preview.nodes.flatMap((proposal) => proposal.kind === "node" ? [{ id: proposal.candidateId, ...proposal.payload }] : []);
  const edges = preview.edges.flatMap((proposal) => proposal.kind === "edge" ? [{
    id: proposal.id, sourceId: proposal.payload.sourceCandidateId, targetId: proposal.payload.targetCandidateId,
    type: proposal.payload.type, label: proposal.payload.label, strength: proposal.payload.strength, rationale: proposal.rationale,
  }] : []);
  const network = toNetworkData(nodes, edges);
  const titles = new Map(nodes.map((node) => [node.id, node.title]));
  const matched = curation.samples.filter((sample) => sample.provenanceStatus === "matched").length;

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8">
      <header className="grid gap-3">
        <p className="text-sm text-muted-foreground">个人阅读预览 · 当前来源与有效审核</p>
        <h1 className="text-3xl font-semibold tracking-tight">从方向进入，沿着思路读下去</h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">这里先让你检验读者能否看懂你的方向、研究框架和思考方式。每一步都保留来源与解释边界；本页仅管理员可读，内容仍是待审核样本。</p>
        <p className="text-xs text-muted-foreground">{matched} / {curation.samples.length} 个样本来源匹配 · {nodes.length} 个候选节点 · {edges.length} 条候选关系 · 无外部 API 调用</p>
        <Link href="/admin/corpus" className="w-fit text-sm underline underline-offset-4">进入候选审核与修改</Link>
        <p className="text-xs leading-6 text-muted-foreground">关系图与候选详情应用当前来源版本有效的审核修改；已驳回节点、边及悬空关系不进入图示（当前排除 {preview.excluded} 项）。批准表示内容接受，尚未录入正式图谱。下方精读样本是独立原案，尚无逐条审核功能。</p>
      </header>

      <nav className="grid gap-3 md:grid-cols-3" aria-label="阅读路径">
        {readingPaths.map((path) => <a key={path.id} href={`#path-${path.id}`} className="grid gap-2 rounded-xl border border-border p-4 hover:bg-muted/40">
          <strong className="text-sm">{path.title}</strong>
          <span className="text-sm leading-6 text-muted-foreground">{path.question}</span>
          <span className="text-xs text-muted-foreground">{path.steps.length} 步阅读</span>
        </a>)}
      </nav>

      <section className="grid gap-3">
        <h2 className="text-xl font-medium">先看整体关系</h2>
        <p className="text-sm leading-6 text-muted-foreground">选中节点可读摘要。图中的“在建筑研究中落地”“共享现实基础”等关系包含分析者的结构化解释，仍需核对。</p>
        <div className="rounded-2xl border border-border bg-[#243038] px-3 py-4 text-slate-100 md:px-5">
          <NetworkGraph nodes={network.nodes} edges={network.edges} height={580} nodeLinkBase={null} />
        </div>
        <details className="rounded-xl border border-border p-4 text-sm">
          <summary className="cursor-pointer font-medium">逐条查看关系与理由</summary>
          <ul className="mt-3 grid gap-3">
            {edges.map((edge) => <li key={edge.id} className="grid gap-1 border-t border-border pt-3">
              <p>{titles.get(edge.sourceId)} → {titles.get(edge.targetId)} <span className="text-muted-foreground">· {edge.label}</span></p>
              <p className="text-xs leading-6 text-muted-foreground">{edge.rationale}</p>
            </li>)}
          </ul>
        </details>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-medium">审核后的候选正文</h2>
        <p className="text-sm leading-6 text-muted-foreground">这里与候选审核页使用同一份编辑结果；保留待审核与已批准状态，方便核对修改是否准确表达。</p>
        <div className="grid gap-3 md:grid-cols-2">{preview.nodes.map((proposal) => proposal.kind === "node" ? <article key={proposal.id} className="grid content-start gap-2 rounded-xl border border-border p-5"><p className="text-xs text-muted-foreground">{proposal.reviewStatus === "approved" ? "已批准 · 待正式录入" : "待审核"}</p><h3 className="font-medium">{proposal.payload.title}</h3><p className="text-sm leading-7">{proposal.payload.summary}</p><p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{proposal.payload.body}</p><p className="border-t border-border pt-2 text-xs leading-6 text-muted-foreground">整理理由：{proposal.rationale}</p></article> : null)}</div>
      </section>

      {readingPaths.map((path) => <section id={`path-${path.id}`} key={path.id} className="grid scroll-mt-6 gap-4">
        <div className="grid gap-2">
          <h2 className="text-xl font-medium">{path.title}</h2>
          <p className="text-sm text-muted-foreground">{path.question}</p>
        </div>
        <ol className="grid gap-4">
          {path.steps.map((step, index) => {
            const sample = curation.samples.find((item) => item.id === step.sampleId)!;
            return <li key={step.sampleId} className="grid gap-2">
              <p className="text-xs leading-6 text-muted-foreground">{index + 1}. {step.reason}</p>
              <SampleCard sample={sample} documentTitles={new Map(documents.map((document) => [document.id, document.title]))} />
            </li>;
          })}
        </ol>
      </section>)}

      <aside className="grid gap-2 rounded-xl border border-border p-5 text-sm leading-7 text-muted-foreground">
        <h2 className="font-medium text-foreground">这轮理解仍有待核对的部分</h2>
        <p>底稿中的建议可能包含 AI 整理，不能逐句归为本人观点。推断出的工作结构尚不代表固定人格或持续实践；创作材料中的信息、信任与交接等主题还需要另建样本。</p>
        <p>阅读先后用于帮助理解，不自动表示因果关系或工程依赖。博士和论文进度保持开放，长期愿景也不转为博士承诺。</p>
      </aside>
    </main>
  );
}

function SampleCard({ sample, documentTitles }: { sample: CuratedSample; documentTitles: Map<string, string> }) {
  if (sample.provenanceStatus !== "matched") {
    return <article className="grid gap-2 rounded-xl border border-dashed border-border p-5 text-sm">
      <h3 className="font-medium">{sample.title}</h3>
      <p className="text-muted-foreground">来源缺失、版本变化或引文无法定位，本步骤暂不展示内容。请重新核对材料。</p>
    </article>;
  }
  return <article className="grid gap-3 rounded-xl border border-border p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-medium">{sample.title}</h3>
      <span className="text-xs text-muted-foreground">{kindLabels[sample.kind]} · 候选</span>
    </div>
    <p className="text-sm leading-7">{sample.text}</p>
    <p className="text-xs leading-6 text-muted-foreground">{basisLabels[sample.basis]}</p>
    <p className="text-xs leading-6 text-muted-foreground">解释边界：{sample.boundary}</p>
    <details className="border-t border-border pt-3 text-sm">
      <summary className="cursor-pointer text-muted-foreground">查看原文证据与整理理由</summary>
      <div className="mt-3 grid gap-3 text-xs leading-6 text-muted-foreground">
        <p>{sample.rationale}</p>
        {sample.evidence.map((evidence, index) => <blockquote key={index} className="grid gap-1 border-l-2 border-border pl-3">
          <p className="whitespace-pre-wrap">{evidence.excerpt}</p>
          <p className="break-all">{evidence.sourceType === "document"
            ? `${documentTitles.get(evidence.sourceId) ?? evidence.sourceId} · ${evidence.chunkId} · 字符 ${evidence.startOffset}–${evidence.endOffset}（UTF-16，左闭右开）`
            : `本人确认 · ${evidence.confirmationField}`}</p>
        </blockquote>)}
      </div>
    </details>
  </article>;
}
