import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { nodeInputSchema } from "./schema";
import type { NodeInput } from "./types";

const candidatesSchema = z.array(z.object({
  id: z.string().min(1).max(200),
  sourceRefs: z.array(z.string().min(1).max(500)).max(50),
  input: nodeInputSchema.extend({
    sourceKind: z.string().max(100),
    sourceExternalId: z.string().max(500),
    sourcePrivate: z.boolean(),
    sourceSnapshot: z.unknown().nullable(),
  }),
})).max(100);

const privateConfigPath = path.join(process.cwd(), "data", "private-config", "hublink-contribution-candidates.json");

export function readHublinkContributionCandidates(): { id: string; input: NodeInput; sourceRefs: string[] }[] {
  try {
    return candidatesSchema.parse(JSON.parse(fs.readFileSync(privateConfigPath, "utf8"))).map(({ id, input, sourceRefs }) => ({
      id,
      sourceRefs,
      input: input as NodeInput,
    }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
