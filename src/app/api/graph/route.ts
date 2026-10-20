import { publicSnapshot, visibleGraph } from "@/domain/graph";
import { views } from "@/domain/registry";
import { listEdges, listNodes } from "@/db/store";

export const dynamic = "force-dynamic";

export function GET() {
  const graph = visibleGraph(listNodes("public"), listEdges("public"), "public");
  return Response.json({
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      title: node.title,
      summary: node.summary,
      role: node.role,
      outcome: node.outcome,
      status: node.status,
      timeStart: node.timeStart,
      timeEnd: node.timeEnd,
      scale: node.scale,
      importance: node.importance,
      centrality: node.centrality,
      primaryUrl: node.primaryUrl,
      exitLinks: node.exitLinks,
      categoryIds: node.categoryIds,
      source: publicSnapshot(node.sourceSnapshot),
    })),
    edges: graph.edges,
    views: views.map((view) => ({
      id: view.id,
      name: view.name,
      question: view.question,
      kind: view.kind,
    })),
  });
}
