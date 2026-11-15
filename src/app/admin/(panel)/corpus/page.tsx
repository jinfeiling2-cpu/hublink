import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { reviewCorpusProposal, runCorpus } from "../../actions";
import type { CorpusRunArtifact } from "@/agents/orchestrator";
import { runCorpusPipeline } from "@/agents/orchestrator";
import { applyProposalReviews, proposalFingerprint, readProposalReviews } from "@/agents/reviews";
import { readModelHistory } from "@/agents/model-history";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function readArtifact(): CorpusRunArtifact | null {
  const file = path.join(process.cwd(), "data", "agent-runs", "local-corpus.json");
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as CorpusRunArtifact;
  } catch {
    return null;
  }
}

export default async function CorpusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const baseArtifact = readArtifact() ? runCorpusPipeline() : null;
  const reviews = readProposalReviews();
  const artifact = baseArtifact ? applyProposalReviews(baseArtifact, reviews) : null;
  const modelHistory = readModelHistory();
  const notice = query.notice === "ran"
    ? "语料分析已重新运行；内容与来源版本相同的审核记录已保留。"
    : query.notice === "reviewed"
      ? "候选审核已保存到独立历史记录；尚未写入正式图谱。"
      : "";

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">本地 Agent 管线</p>
            <h1 className="text-3xl font-semibold tracking-tight">语料分析</h1>
          </div>
          <form action={runCorpus}>
            <Button type="submit">重新分析语料</Button>
          </form>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          当前首轮管线只读取 <code>data/material-text/</code> 中的文本，生成带来源的片段和待审核陈述，并检查可能的联系方式。它不会写入正式节点，也不会自动发布内容。
        </p>
        {notice ? <p className="text-sm text-primary">{notice}</p> : null}
        <Link href="/admin/corpus/reading" className="w-fit text-sm underline underline-offset-4">查看一分钟概况、研究框架与思考方式预览</Link>
      </header>

      {!artifact ? (
        <section className="grid gap-2 rounded-xl border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">
          <p>还没有运行记录。</p>
          <p>点击“重新分析语料”，或在本地执行 <code>npm run corpus:run</code>。</p>
        </section>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <Metric label="文档" value={artifact.report.documents.length} />
            <Metric label="片段" value={artifact.report.chunks} />
            <Metric label="待审核陈述" value={artifact.report.reviewQueue} />
            <Metric label="隐私告警" value={artifact.privacyFindings.length} />
          </section>

          <section className="grid gap-3 rounded-xl border border-border p-5">
            <h2 className="font-medium">处理记录</h2>
            <p className="text-sm text-muted-foreground">运行 ID：{artifact.run.id}</p>
            <p className="text-sm text-muted-foreground">管线版本：{artifact.run.promptVersion}</p>
            <p className="text-sm text-muted-foreground">本轮为本地确定性处理。模型抽取需单独配置并显式运行，不会随“重新分析语料”触发。</p>
            <p className="text-sm text-muted-foreground">已保留 {reviews.length} 条审核操作。候选内容或来源版本变化后，旧审核不自动套用。</p>
          </section>

          <section className="grid gap-3">
            <h2 className="font-medium">材料清单</h2>
            <ul className="grid gap-2">
              {artifact.report.documents.map((document) => (
                <li key={document.id} className="grid gap-1 rounded-xl border border-border px-4 py-3">
                  <span className="font-medium">{document.title}</span>
                  <span className="text-xs text-muted-foreground">{document.kind} · {document.chunkCount} 个片段 · {document.characterCount} 字符 · {document.ownerConfirmed ? "本人已确认内容" : "待审核来源"} · {document.visibility}</span>
                  <code className="break-all text-xs text-muted-foreground">{document.path}</code>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-3">
            <h2 className="font-medium">图谱候选预览</h2>
            <p className="text-sm leading-6 text-muted-foreground">这批候选根据本轮确认生成，仍未写入正式节点。节点和连接都保留来源、理由和审核状态。</p>
            <div className="grid gap-2 md:grid-cols-2">
              {artifact.graphPreview.proposals.map((proposal) => (
                <article key={proposal.id} className="grid gap-2 rounded-xl border border-border px-4 py-3 text-sm leading-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{proposal.kind === "node" ? proposal.payload.title : `${proposal.payload.sourceCandidateId} → ${proposal.payload.targetCandidateId}`}</span>
                    <span className="text-xs text-muted-foreground">{proposal.kind} · {proposal.reviewStatus === "candidate" ? "待审核" : proposal.reviewStatus === "approved" ? "已批准（待写入）" : "已驳回"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{proposal.kind === "node" ? `${proposal.payload.type} · ${proposal.payload.summary}` : `${proposal.payload.type} · ${proposal.payload.label}`}</p>
                  <p className="text-xs text-muted-foreground">依据 {proposal.evidence.map((item) => item.sourceId).join(", ")} · 置信度 {proposal.confidence.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">关系与内容理由：{proposal.rationale}</p>
                  <div className="grid gap-2 border-t border-border pt-2">
                    {proposal.evidence.map((evidence, index) => {
                      const document = evidence.sourceType === "document" ? artifact.documents.find((item) => item.id === evidence.sourceId) : null;
                      const chunk = document && evidence.chunkId ? document.chunks.find((item) => item.id === evidence.chunkId) : null;
                      return <blockquote key={`${proposal.id}-evidence-${index}`} className="border-l-2 border-border pl-3 text-xs text-muted-foreground">“{evidence.excerpt}”<span className="mt-1 block text-[11px]">{document ? `${document.title} · ${evidence.chunkId}` : "参与者确认"}{chunk?.sectionPath.length ? ` · ${chunk.sectionPath.join(" / ")}` : ""}</span></blockquote>;
                    })}
                  </div>
                  <form action={reviewCorpusProposal} className="grid gap-2 border-t border-border pt-2">
                    <input type="hidden" name="proposalId" value={proposal.id} />
                    <input type="hidden" name="fingerprint" value={proposalFingerprint(baseArtifact!, baseArtifact!.graphPreview.proposals.find((item) => item.id === proposal.id)!)} />
                    {proposal.kind === "node" ? <>
                      <input name="title" defaultValue={proposal.payload.title} className="rounded-md border border-border bg-transparent px-2 py-1 text-sm" aria-label="候选标题" />
                      <input name="summary" defaultValue={proposal.payload.summary} className="rounded-md border border-border bg-transparent px-2 py-1 text-sm" aria-label="候选摘要" />
                      <textarea name="body" defaultValue={proposal.payload.body} className="min-h-20 rounded-md border border-border bg-transparent px-2 py-1 text-sm" aria-label="候选正文" />
                    </> : <input name="label" defaultValue={proposal.payload.label} className="rounded-md border border-border bg-transparent px-2 py-1 text-sm" aria-label="连接标签" />}
                    <div className="flex flex-wrap gap-2">
                      <button name="status" value="candidate" type="submit" className="rounded-md border border-border px-2 py-1 text-xs">保存修改</button>
                      <button name="status" value="approved" type="submit" className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">批准候选</button>
                      <button name="status" value="rejected" type="submit" className="rounded-md border border-destructive/50 px-2 py-1 text-xs text-destructive">驳回候选</button>
                    </div>
                  </form>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-3 rounded-xl border border-border p-5">
            <h2 className="font-medium">模型抽取记录</h2>
            <p className="text-sm leading-6 text-muted-foreground">默认关闭。可先运行 <code>npm run corpus:model</code> 选择文档并预览片段，再按 README 配置服务端调用。模型陈述单独保存，尚不进入图谱候选或正式节点。</p>
            {!modelHistory.length ? <p className="text-sm text-muted-foreground">尚无模型运行记录。</p> : null}
            {modelHistory.map((record) => (
              <details key={record.run.id} className="rounded-lg border border-border p-3 text-sm">
                <summary className="cursor-pointer">{record.run.model} · {record.run.status === "completed" ? "完成" : "失败"} · {record.claims.length} 条候选 · {record.run.completedAt}</summary>
                <div className="mt-3 grid gap-3">
                  <p className="break-all text-xs text-muted-foreground">{record.run.id} · 输入 {record.inputHash}</p>
                  {record.run.error ? <p className="text-destructive">错误：{record.run.error}</p> : null}
                  {record.claims.map((claim) => <article key={claim.id} className="grid gap-1 border-t border-border pt-2">
                    <p>{claim.text}</p>
                    <p className="text-xs text-muted-foreground">{claim.kind} · {claim.author} · 待审核 · {claim.rationale}</p>
                    {claim.evidence.map((evidence, index) => <blockquote key={index} className="border-l-2 border-border pl-3 text-xs text-muted-foreground">“{evidence.quote}” · {evidence.chunkId}</blockquote>)}
                  </article>)}
                </div>
              </details>
            ))}
          </section>

          <section className="grid gap-3">
            <h2 className="font-medium">首批陈述候选</h2>
            <p className="text-sm leading-6 text-muted-foreground">以下只展示样本。它们还没有进入正式图谱，尤其不能直接当作事实或个人画像。</p>
            <ul className="grid gap-2">
              {artifact.report.claimSamples.map((claim) => (
                <li key={claim.id} className="grid gap-2 rounded-xl border border-border px-4 py-3 text-sm leading-6">
                  <p>{claim.text}</p>
                  <p className="text-xs text-muted-foreground">{claim.kind} · {claim.author} · 置信度 {claim.confidence.toFixed(2)} · 来源 {claim.chunkIds.join(", ")}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-1 rounded-xl border border-border p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <strong className="text-2xl font-semibold">{value.toLocaleString("zh-CN")}</strong>
    </div>
  );
}
