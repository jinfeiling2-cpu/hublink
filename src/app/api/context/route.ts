import { buildPublicContext } from "@/domain/public-context";
import { listEdges, listNodes } from "@/db/store";
import { publicSiteUrl } from "@/content/profile";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestedUrl = new URL(request.url);
  // Next's bind address can be 0.0.0.0; links should use the visitor's host.
  const host = request.headers.get("host");
  if (host) requestedUrl.host = host;
  const context = buildPublicContext(listNodes("public"), listEdges("public"), publicSiteUrl() || requestedUrl.origin);
  return Response.json(context, {
    headers: { "Cache-Control": "no-store", "X-Publication-Version": context.publicationVersion },
  });
}
