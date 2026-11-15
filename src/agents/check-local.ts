import path from "node:path";
import { evaluateLocalCorpus } from "./evaluation";
import { agentDataDirectory, writeLocalJson } from "./local-store";

const result = evaluateLocalCorpus();
writeLocalJson(path.join(agentDataDirectory, "local-validation.json"), result);
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
if (!result.passed) process.exitCode = 1;
