import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { agentDataDirectory } from "./local-store";
import { agentRunSchema, claimSchema, textChunkSchema } from "./schemas";

const modelHistorySchema = z.object({
  run: agentRunSchema,
  inputHash: z.string(),
  sourceContentHash: z.string(),
  sourceChunks: z.array(textChunkSchema),
  claims: z.array(claimSchema.extend({ evidence: z.array(z.object({ chunkId: z.string(), quote: z.string() })) })),
});

export function readModelHistory(directory = agentDataDirectory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((file) => /^model-run-[\da-f-]+\.json$/.test(file))
    .map((file) => ({ file, modified: fs.statSync(path.join(directory, file)).mtimeMs }))
    .sort((left, right) => right.modified - left.modified)
    .slice(0, 10)
    .flatMap(({ file }) => {
      try {
        return [modelHistorySchema.parse(JSON.parse(fs.readFileSync(path.join(directory, file), "utf8")))];
      } catch {
        return [];
      }
    });
}
