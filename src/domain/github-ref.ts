export function parseGithubRepo(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const fromUrl = trimmed.match(/github\.com\/([^/\s]+)\/([^/\s]+)/i);
  const match = fromUrl ?? trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2];
  if (!owner || !repo || owner === "." || repo === ".") return null;
  return { owner, repo };
}
