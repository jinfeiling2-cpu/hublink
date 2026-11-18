import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildPublicContext } from "./public-context";
import {
  addPrivateAction,
  addPrivateClaim,
  addPrivateFeedback,
  addPrivateSource,
  createPrivateEpisode,
  privateClaimSchema,
  privateEpisodeSchema,
  readPrivateRecordFile,
  updatePrivateClaimStatus,
  updatePrivateActionResult,
  updatePrivateEpisode,
  updatePrivateSourceStatus,
} from "./private-records";

function withPrivateFile(run: (filePath: string) => void) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hublink-records-"));
  try { run(path.join(directory, "private-records.json")); }
  finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

test("quick records default to private drafts and preserve structured decision fields", () => withPrivateFile((filePath) => {
  const episode = createPrivateEpisode({ kind: "decision", title: "Synthetic decision", body: "A short private note." }, filePath);
  assert.equal(episode.privacy, "private");
  assert.equal(episode.status, "draft");
  assert.equal(episode.decision, "");
  assert.equal(readPrivateRecordFile(filePath).episodes[0].id, episode.id);
}));

test("sources, claims, actions, feedback and revisions remain linked and recoverable", () => withPrivateFile((filePath) => {
  const episode = createPrivateEpisode({ kind: "thought", title: "Synthetic evidence trail" }, filePath);
  const withSource = addPrivateSource(episode.id, {
    sourceType: "user_statement", title: "Local note reference", locator: "private note section 2",
    observedAt: null, effectiveDate: null, privacy: "private", verificationStatus: "needs_review", summary: "Reference only.", scope: "This example only.",
  }, filePath);
  const sourceId = withSource.sources[0].id;
  assert.equal(withSource.sources[0].privacy, "private");
  assert.equal(withSource.sources[0].checkedBy, null);
  const withClaim = addPrivateClaim(episode.id, {
    content: "AI candidate claim marker: PRIVATE_ONLY_XQ7", claimType: "ai_inference", status: "candidate",
    sourceIds: [sourceId], checkedAt: null, scope: "Synthetic test", privacy: "private", proposedBy: "ai",
  }, filePath);
  assert.equal(withClaim.claims[0].status, "candidate");
  assert.equal(withClaim.claims[0].checkedAt, null);
  assert.equal(withClaim.claims[0].checkedBy, null);
  const reviewedClaim = updatePrivateClaimStatus(episode.id, withClaim.claims[0].id, "confirmed", filePath);
  assert.equal(reviewedClaim.claims[0].status, "confirmed");
  assert.ok(reviewedClaim.claims[0].checkedAt);
  assert.equal(reviewedClaim.claims[0].checkedBy, "admin_session");
  assert.equal(readPrivateRecordFile(filePath).history.find((item) => item.change === "claim_added")?.snapshot.claims[0].status, "candidate");
  updatePrivateSourceStatus(episode.id, sourceId, "confirmed", filePath);
  const withAction = addPrivateAction(episode.id, {
    description: "Review a local hypothesis", owner: "user", authorizationLevel: "L0", status: "planned",
    expectedResult: "A decision", actualResult: "", feedback: "", sourceIds: [sourceId], date: null,
  }, filePath);
  const actionUpdate = updatePrivateActionResult(episode.id, withAction.actions[0].id, {
    status: "done", actualResult: "The owner completed the review.", feedback: "One unresolved question remains.",
  }, filePath);
  assert.equal(actionUpdate.actions[0].actualResult, "The owner completed the review.");
  const withFeedback = addPrivateFeedback(episode.id, { text: "The evidence remains incomplete.", sourceIds: [sourceId] }, filePath);
  assert.equal(withAction.actions.length, 1);
  assert.equal(withFeedback.feedback.length, 1);
  const restored = readPrivateRecordFile(filePath);
  assert.equal(restored.episodes[0].claims[0].content, "AI candidate claim marker: PRIVATE_ONLY_XQ7");
  assert.ok(restored.history.some((item) => item.change === "source_added"));
  assert.ok(restored.history.some((item) => item.change === "source_updated"));
  assert.ok(restored.history.some((item) => item.change === "claim_added"));
  assert.ok(restored.history.some((item) => item.change === "claim_updated"));
  assert.ok(restored.history.some((item) => item.change === "action_added"));
  assert.ok(restored.history.some((item) => item.change === "action_updated"));
  assert.ok(restored.history.some((item) => item.change === "feedback_added"));
  assert.equal(fs.statSync(filePath).mode & 0o777, 0o600);
}));

test("owner can revise or archive and restore without deleting the prior snapshot", () => withPrivateFile((filePath) => {
  const episode = createPrivateEpisode({ kind: "decision", title: "Original title" }, filePath);
  updatePrivateEpisode(episode.id, { title: "Revised title", status: "active" }, filePath);
  updatePrivateEpisode(episode.id, { status: "archived" }, filePath);
  updatePrivateEpisode(episode.id, { status: "active" }, filePath);
  const file = readPrivateRecordFile(filePath);
  assert.equal(file.episodes[0].title, "Revised title");
  assert.deepEqual(file.history.map((item) => item.change), ["created", "updated", "archived", "restored"]);
  assert.equal(file.history[0].snapshot.title, "Original title");
}));

test("invalid claims and dangling source references are rejected", () => withPrivateFile((filePath) => {
  const episode = createPrivateEpisode({ kind: "thought", title: "Validation" }, filePath);
  assert.equal(privateClaimSchema.safeParse({ content: "bad", claimType: "ai_inference", status: "confirmed" }).success, false);
  assert.throws(() => addPrivateClaim(episode.id, {
    content: "Claim with a missing source", claimType: "self_reported", status: "candidate", sourceIds: ["missing-source"],
    checkedAt: null, scope: "Synthetic", privacy: "private", proposedBy: "user",
  }, filePath), /Unknown private source reference/);
  assert.equal(readPrivateRecordFile(filePath).episodes[0].claims.length, 0);
  assert.equal(privateEpisodeSchema.safeParse({ id: "bad", privacy: "public" }).success, false);
}));

test("private record marker is absent from anonymous context output", () => withPrivateFile((filePath) => {
  createPrivateEpisode({ kind: "thought", title: "PRIVATE_ONLY_PAGE_XQ7", body: "PRIVATE_ONLY_BODY_XQ7" }, filePath);
  const publicContext = JSON.stringify(buildPublicContext([], [], "http://localhost"));
  assert.equal(publicContext.includes("PRIVATE_ONLY_PAGE_XQ7"), false);
  assert.equal(publicContext.includes("PRIVATE_ONLY_BODY_XQ7"), false);
}));
