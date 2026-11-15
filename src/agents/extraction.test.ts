import assert from "node:assert/strict";
import test from "node:test";
import { planExtraction, runClaimExtraction } from "./extraction";
import type { CorpusDocument } from "./ingest";
import { createOpenAIAdapter, ModelCallError, readModelConfig, type ClaimModelAdapter } from "./model";

function document(): CorpusDocument {
  const text = "计划建立共享情境模型。";
  return {
    id: "test-document", title: "test", path: "test.md", kind: "research", visibility: "personal",
    author: "unknown", contentHash: "test-hash", status: "processed", ownerConfirmed: false,
    characterCount: text.length, chunkCount: 1, text, claims: [],
    chunks: [{ id: "test-chunk", documentId: "test-document", text, sectionPath: [], ordinal: 0, startOffset: 0, endOffset: text.length }],
  };
}

const candidate = () => ({
  text: "计划建立共享情境模型。", kind: "planned", author: "unknown", topic: "research_goal",
  confidence: 0.7, rationale: "原文表达一个计划。",
  evidence: [{ chunkId: "test-chunk", quote: "计划建立共享情境模型。" }],
});
const adapter = (output: unknown): ClaimModelAdapter => ({
  model: "test-model", async extract() { return { output, responseId: "test-response", usage: null }; },
});

test("模型配置默认关闭，不因存在 API key 而自动启用", () => {
  assert.throws(() => readModelConfig({ OPENAI_API_KEY: "test-only-key" }), /model_disabled/);
  assert.throws(() => readModelConfig({ CORPUS_MODEL_ENABLED: "true" }), /missing_api_key/);
  assert.throws(() => readModelConfig({ CORPUS_MODEL_ENABLED: "true", OPENAI_API_KEY: "test-only-key" }), /missing_model/);
});

test("输入计划跳过联系方式并限制片段数量与字符量", () => {
  const source = document();
  source.chunks.unshift({ ...source.chunks[0], id: "private", text: "联系 test@example.com" });
  source.chunks.push({ ...source.chunks[1], id: "large", text: "a".repeat(6001) });
  const plan = planExtraction(source, 3);
  assert.deepEqual(plan.chunks.map((chunk) => chunk.id), ["test-chunk"]);
  assert.equal(plan.blockedChunks, 1);
  assert.equal(JSON.stringify(plan.input).includes("test@example.com"), false);
  assert.throws(() => planExtraction(source, 9));
  const before = plan.inputHash;
  source.contentHash = "changed-hash";
  assert.notEqual(planExtraction(source, 3).inputHash, before);
});

test("合法模型输出仍为带精确引文的候选，运行保留来源版本", async () => {
  const result = await runClaimExtraction(planExtraction(document()), adapter({ claims: [candidate()] }));
  assert.equal(result.run.status, "completed");
  assert.equal(result.sourceContentHash, "test-hash");
  assert.equal(result.claims[0].reviewStatus, "candidate");
  assert.deepEqual(result.claims[0].chunkIds, ["test-chunk"]);
  assert.equal(result.sourceChunks[0].text.includes(result.claims[0].evidence[0].quote), true);
});

test("未知片段、伪造引文、升格确认和研究进度导致整批拒收", async () => {
  const invalid = [
    { ...candidate(), evidence: [{ chunkId: "invented", quote: "计划建立共享情境模型。" }] },
    { ...candidate(), evidence: [{ chunkId: "test-chunk", quote: "不存在的引文" }] },
    { ...candidate(), kind: "confirmed" },
    { ...candidate(), topic: "research_progress" },
  ];
  for (const claim of invalid) {
    const result = await runClaimExtraction(planExtraction(document()), adapter({ claims: [candidate(), claim] }));
    assert.equal(result.run.status, "failed");
    assert.deepEqual(result.claims, []);
    assert.deepEqual(result.run.outputClaimIds, []);
  }
});

test("没有可用片段时不调用模型，错误内容不进入运行记录", async () => {
  const plan = planExtraction(document());
  let calls = 0;
  const failing: ClaimModelAdapter = { model: "test", async extract() {
    calls++;
    throw new Error("secret provider body");
  } };
  const first = await runClaimExtraction({ ...plan, chunks: [] }, failing);
  assert.equal(calls, 0);
  assert.equal(first.run.error, "no_eligible_chunks");
  const second = await runClaimExtraction(plan, failing);
  assert.equal(second.run.error, "invalid_model_output");
  assert.equal(JSON.stringify(second).includes("secret provider body"), false);
});

test("Responses 适配器发送结构化请求，拒收截断、拒答和 HTTP 错误", async () => {
  let request: Record<string, unknown> | undefined;
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    request = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      id: "response-test", status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ claims: [candidate()] }) }] }],
      usage: { input_tokens: 100, output_tokens: 50 },
    }));
  };
  const model = createOpenAIAdapter({ apiKey: "test-only-key", model: "test-model" }, fetcher);
  const result = await model.extract({ instructions: "test instructions", input: "test input" });
  assert.equal(request?.store, false);
  assert.equal(request?.max_output_tokens, 4000);
  assert.equal(result.usage?.inputTokens, 100);
  const text = request?.text as { format: { strict: boolean; schema: { additionalProperties: boolean } } };
  assert.equal(text.format.strict, true);
  assert.equal(text.format.schema.additionalProperties, false);

  for (const [body, code] of [
    [{ id: "test", status: "incomplete", output: [] }, "incomplete_response"],
    [{ id: "test", status: "completed", output: [{ type: "message", content: [{ type: "refusal" }] }] }, "model_refusal"],
  ] as const) {
    const model = createOpenAIAdapter({ apiKey: "test-only-key", model: "test-model" }, async () => new Response(JSON.stringify(body)));
    await assert.rejects(model.extract({ instructions: "", input: "" }), (error) => error instanceof ModelCallError && error.code === code);
  }
  const httpError = createOpenAIAdapter({ apiKey: "test-only-key", model: "test-model" }, async () => new Response("secret body", { status: 429 }));
  await assert.rejects(httpError.extract({ instructions: "", input: "" }), /provider_http_429/);
});
