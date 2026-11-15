import fs from "node:fs";
import path from "node:path";
import { githubEdges, githubNodes } from "../data/github-graph";

const file = path.join(process.cwd(), "data", "github-reading-draft.json");
fs.writeFileSync(file, JSON.stringify({ nodes: githubNodes, edges: githubEdges }, null, 2) + "\n");
console.log(`${githubNodes.length} nodes, ${githubEdges.length} edges`);
