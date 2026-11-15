import path from "node:path";
import { runCorpusPipeline } from "./orchestrator";
import { writeLocalJson } from "./local-store";

const outputPath = path.join(process.cwd(), "data", "agent-runs", "local-corpus.json");

export function runLocalCorpus() {
  const result = runCorpusPipeline();
  writeLocalJson(outputPath, result);
  return { outputPath, report: result.report, privacyFindings: result.privacyFindings.length, graphPreview: result.graphPreview, curation: result.curation, run: result.run };
}

if (process.argv[1]?.endsWith("run-local.ts")) {
  const result = runLocalCorpus();
  process.stdout.write(JSON.stringify({
    outputPath: result.outputPath,
    runId: result.run.id,
    documents: result.report.documents.length,
    chunks: result.report.chunks,
    claims: result.report.claims,
    privacyFindings: result.privacyFindings,
    graphNodes: result.graphPreview.proposals.filter((proposal) => proposal.kind === "node").length,
    graphEdges: result.graphPreview.proposals.filter((proposal) => proposal.kind === "edge").length,
    curatedSamples: result.curation.samples.length,
    matchedSamples: result.curation.samples.filter((sample) => sample.provenanceStatus === "matched").length,
  }, null, 2) + "\n");
}
