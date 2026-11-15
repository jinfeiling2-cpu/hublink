import path from "node:path";
import { parseArgs } from "node:util";
import { loadEnvConfig } from "@next/env";
import { readCorpus } from "./ingest";
import { planExtraction, runClaimExtraction } from "./extraction";
import { createOpenAIAdapter, ModelCallError, readModelConfig } from "./model";
import { agentDataDirectory, writeLocalJson } from "./local-store";

async function main() {
  loadEnvConfig(process.cwd());
  const { values } = parseArgs({ options: {
    document: { type: "string" },
    "max-chunks": { type: "string", default: "3" },
    execute: { type: "boolean", default: false },
  } });
  const documents = readCorpus();
  const document = documents.find((item) => item.id === values.document);
  if (!document) {
    process.stdout.write(JSON.stringify({
      message: "Select a local document with --document <id>. Default is dry run; --execute sends eligible chunks to OpenAI.",
      documents: documents.map(({ id, kind, chunkCount }) => ({ id, kind, chunkCount })),
    }, null, 2) + "\n");
    if (values.document) process.exitCode = 1;
    return;
  }
  const plan = planExtraction(document, Number(values["max-chunks"]));
  if (!values.execute) {
    process.stdout.write(JSON.stringify({
      mode: "dry_run", documentId: plan.documentId, inputHash: plan.inputHash,
      chunkIds: plan.chunks.map((chunk) => chunk.id), characters: plan.characters,
      privacyBlockedChunks: plan.blockedChunks, externalRequests: 0,
    }, null, 2) + "\n");
    return;
  }
  const result = await runClaimExtraction(plan, createOpenAIAdapter(readModelConfig()));
  const outputPath = path.join(agentDataDirectory, `${result.run.id}.json`);
  writeLocalJson(outputPath, result);
  process.stdout.write(JSON.stringify({
    runId: result.run.id, status: result.run.status, error: result.run.error,
    claims: result.claims.length, usage: result.usage, outputPath,
  }, null, 2) + "\n");
  if (result.run.status === "failed") process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write((error instanceof ModelCallError ? error.code : "Invalid command or local corpus/configuration.") + "\n");
  process.exitCode = 1;
});
