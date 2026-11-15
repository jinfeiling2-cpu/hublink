import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const confirmationSchema = z.object({
  ownerConfirmationId: z.string().max(200),
  confirmedResumeSources: z.array(z.object({
    documentId: z.string().min(1).max(200),
    contentHash: z.string().min(1).max(200),
  })).max(100),
  ownerConfirmations: z.array(z.object({
    id: z.string().min(1).max(200),
    field: z.string().min(1).max(200),
    text: z.string().min(1).max(5000),
  })).max(100),
});

const privateConfigPath = path.join(process.cwd(), "data", "private-config", "owner-confirmations.json");

function readPrivateConfirmations() {
  try {
    return confirmationSchema.parse(JSON.parse(fs.readFileSync(privateConfigPath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ownerConfirmationId: "", confirmedResumeSources: [], ownerConfirmations: [] };
    }
    throw error;
  }
}

const privateConfirmations = readPrivateConfirmations();

export const ownerConfirmationId = privateConfirmations.ownerConfirmationId;
export const confirmedResumeSources = privateConfirmations.confirmedResumeSources;
export const ownerConfirmations = privateConfirmations.ownerConfirmations;
