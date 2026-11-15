import { z } from "zod";
import { authorKindSchema } from "./schemas";

export const extractionPromptVersion = "source-backed-claims-v1";

// A model may propose interpretations, but it cannot grant confirmation or approval.
export const extractionSchema = z.object({
  claims: z.array(z.object({
    text: z.string().min(1).max(2000),
    kind: z.enum(["self_reported", "planned", "suggested", "inferred", "open", "unclassified"]),
    author: authorKindSchema,
    topic: z.enum(["identity", "research_goal", "research_progress", "creative_concept", "project_method", "other"]),
    confidence: z.number().min(0).max(1),
    rationale: z.string().min(1).max(2000),
    evidence: z.array(z.object({
      chunkId: z.string().min(1),
      quote: z.string().min(1).max(2000),
    }).strict()).min(1).max(4),
  }).strict()).max(24),
}).strict();
export type Extraction = z.infer<typeof extractionSchema>;

export type ModelRequest = { instructions: string; input: string };
export type ModelResult = { output: unknown; responseId: string | null; usage: { inputTokens: number; outputTokens: number } | null };
export interface ClaimModelAdapter {
  model: string;
  extract(request: ModelRequest): Promise<ModelResult>;
}

export class ModelCallError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export function readModelConfig(env: Record<string, string | undefined> = process.env) {
  if (env.CORPUS_MODEL_ENABLED !== "true") throw new ModelCallError("model_disabled");
  const apiKey = env.OPENAI_API_KEY?.trim();
  const model = env.CORPUS_MODEL?.trim();
  if (!apiKey) throw new ModelCallError("missing_api_key");
  if (!model) throw new ModelCallError("missing_model");
  return { apiKey, model };
}

const responseSchema = z.object({
  id: z.string(),
  status: z.string(),
  output: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
  })),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }).nullish(),
});

export function createOpenAIAdapter(
  config: ReturnType<typeof readModelConfig>,
  fetcher: typeof fetch = fetch,
): ClaimModelAdapter {
  return {
    model: config.model,
    async extract(request) {
      let response: Response;
      try {
        response = await fetcher("https://api.openai.com/v1/responses", {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(45000),
          headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: config.model,
            store: false,
            instructions: request.instructions,
            input: request.input,
            max_output_tokens: 4000,
            text: { format: {
              type: "json_schema", name: "corpus_claims", strict: true,
              schema: z.toJSONSchema(extractionSchema),
            } },
          }),
        });
      } catch {
        // Do not persist provider errors, which can echo credentials or corpus text.
        throw new ModelCallError("network_or_timeout");
      }
      if (!response.ok) throw new ModelCallError(`provider_http_${response.status}`);
      try {
        const body = responseSchema.parse(await response.json());
        if (body.status !== "completed") throw new ModelCallError("incomplete_response");
        const content = body.output.filter((item) => item.type === "message").flatMap((item) => item.content ?? []);
        if (content.some((item) => item.type === "refusal")) throw new ModelCallError("model_refusal");
        const text = content.filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("");
        return {
          output: extractionSchema.parse(JSON.parse(text)),
          responseId: body.id,
          usage: body.usage ? { inputTokens: body.usage.input_tokens, outputTokens: body.usage.output_tokens } : null,
        };
      } catch (error) {
        if (error instanceof ModelCallError) throw error;
        throw new ModelCallError("invalid_response");
      }
    },
  };
}
