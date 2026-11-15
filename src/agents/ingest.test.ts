import test from "node:test";
import assert from "node:assert/strict";
import { corpusReport, readCorpus, splitChunks } from "./ingest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanPrivacy } from "./privacy";
import { runCorpusPipeline } from "./orchestrator";

test("本地语料可以分成文档、片段和待审核陈述", () => {
  const documents = readCorpus();
  const report = corpusReport(documents);
  assert.ok(report.documents.length >= 4);
  assert.ok(report.chunks > report.documents.length);
  assert.ok(report.claims >= report.chunks);
  assert.ok(documents.every((document) => document.visibility === "personal"));
  assert.ok(documents.some((document) => document.kind === "resume"));
  assert.ok(documents.some((document) => document.kind === "creative"));
  assert.ok(documents.flatMap((document) => document.claims).every((claim) => claim.reviewStatus === "candidate"));
  assert.ok(documents.flatMap((document) => document.claims).every((claim) => claim.author !== "self" || claim.kind !== "unclassified" || claim.confidence <= 0.4));
  assert.ok(documents.flatMap((document) => document.chunks).every((chunk) => chunk.endOffset <= documents.find((document) => document.id === chunk.documentId)!.characterCount));
  assert.ok(documents.flatMap((document) => document.chunks).some((chunk) => chunk.sectionPath.length > 0));
});

test("连续简历行可分离联系方式，保留精确范围及末行", () => {
  const text = "个人简历\r\n联系 test@example.com\r\n教育背景\r\n研究方向：现实约束下的决策。";
  const chunks = splitChunks(text, "test-resume", true);
  assert.equal(chunks.length, 4);
  assert.ok(chunks.every((chunk) => text.slice(chunk.startOffset, chunk.endOffset) === chunk.text));
  const blocked = new Set(scanPrivacy(chunks).map((finding) => finding.chunkId));
  assert.equal(blocked.size, 1);
  assert.ok(chunks.some((chunk) => !blocked.has(chunk.id) && chunk.text.includes("研究方向")));
});

test("数字章节正确归层，带句号的编号列表不替换章节", () => {
  const text = "1. 主章\n段落一\n1.1 子章\n段落二\n1. 这是一条完整建议。\n2. 新章\n段落三";
  const chunks = splitChunks(text, "test-headings");
  assert.deepEqual(chunks.find((chunk) => chunk.text === "段落二")?.sectionPath, ["1 主章", "1.1 子章"]);
  assert.deepEqual(chunks.find((chunk) => chunk.text.includes("完整建议"))?.sectionPath, ["1 主章", "1.1 子章"]);
  assert.deepEqual(chunks.find((chunk) => chunk.text === "段落三")?.sectionPath, ["2 新章"]);
  assert.ok(chunks.every((chunk) => text.slice(chunk.startOffset, chunk.endOffset) === chunk.text));
});

test("说话人延续到后续段落，新增简历不自动继承旧版确认", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hublink-ingest-"));
  try {
    fs.writeFileSync(path.join(root, "测试简历.txt"), "研究经历\n我正在准备研究。\n");
    fs.writeFileSync(path.join(root, "测试对话.txt"), "ChatGPT 说：\n\n建议增加一个评价模块。\n\n以后希望发布。\n\n你说：\n\n我希望先核对来源。\n");
    const documents = readCorpus(root);
    assert.equal(documents.find((document) => document.kind === "resume")?.ownerConfirmed, false);
    const claims = documents.flatMap((document) => document.claims);
    assert.equal(claims.find((claim) => claim.text === "建议增加一个评价模块。")?.author, "ai");
    assert.equal(claims.find((claim) => claim.text === "以后希望发布。")?.kind, "suggested");
    assert.equal(claims.find((claim) => claim.text === "我希望先核对来源。")?.author, "self");
    assert.ok(claims.every((claim) => claim.kind !== "confirmed"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("简历中的联系方式会产生待人工核查的隐私告警", () => {
  const resume = readCorpus().find((document) => document.kind === "resume");
  assert.ok(resume);
  const findings = scanPrivacy(resume.chunks);
  assert.ok(findings.some((finding) => finding.category === "email"));
  assert.ok(findings.some((finding) => finding.category === "phone"));
});

test("管线版本与输入内容形成稳定运行标识", () => {
  const first = runCorpusPipeline();
  const second = runCorpusPipeline();
  assert.equal(first.run.id, second.run.id);
  assert.equal(first.run.mode, "deterministic");
  assert.ok(first.report.reviewQueue > 0);
  assert.equal(first.claims.length, first.report.claims);
});
