import { parseGithubRepo } from "@/domain/github-ref";
import type { SourcePull, SourceSnapshot } from "@/domain/types";

type GithubRepo = {
  full_name?: string;
  name?: string;
  private?: boolean;
  description?: string | null;
  homepage?: string | null;
  language?: string | null;
  topics?: string[];
  stargazers_count?: number;
  forks_count?: number;
  pushed_at?: string | null;
  html_url?: string;
  license?: { spdx_id?: string | null } | null;
};

type GithubContent = {
  name: string;
  type: string;
  path: string;
};

export class GithubPullError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GithubPullError";
  }
}

function headers(token?: string) {
  const value: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "hublink",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) value.Authorization = `Bearer ${token}`;
  return value;
}

async function readOptional(url: string, token: string | undefined, accept?: string) {
  const response = await fetch(url, {
    headers: { ...headers(token), ...(accept ? { Accept: accept } : {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return null;
  return response;
}

export async function pullGithubRepo(input: string, token?: string): Promise<SourcePull> {
  const parsed = parseGithubRepo(input);
  if (!parsed) {
    throw new GithubPullError("请填写 owner/repo，或一个 GitHub 仓库链接。");
  }

  const response = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
    headers: headers(token),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });

  if (response.status === 404) {
    throw new GithubPullError(
      token
        ? "找不到这个仓库，或当前令牌无权读取它。"
        : "找不到这个仓库。私有仓库需要在服务器的 GITHUB_TOKEN 里提供只读令牌。",
    );
  }
  if (response.status === 401) {
    throw new GithubPullError("GitHub 令牌无效。");
  }
  if (response.status === 403 || response.status === 429) {
    throw new GithubPullError("GitHub 暂时拒绝了请求，可能是访问次数到了上限。");
  }
  if (!response.ok) {
    throw new GithubPullError(`GitHub 返回了 ${response.status}。`);
  }

  const repo = (await response.json()) as GithubRepo;
  const ownerRepo = repo.full_name || `${parsed.owner}/${parsed.repo}`;
  const readmeResponse = await readOptional(
    `https://api.github.com/repos/${ownerRepo}/readme`,
    token,
    "application/vnd.github.raw+json",
  );
  const readme = readmeResponse ? (await readmeResponse.text()).replace(/\s+/g, " ").trim() : "";
  const contentsResponse = await readOptional(`https://api.github.com/repos/${ownerRepo}/contents`, token);
  const contents = contentsResponse ? ((await contentsResponse.json()) as GithubContent[]) : [];
  const rootEntries = Array.isArray(contents)
    ? contents.slice(0, 30).map((item) => ({ name: item.name, type: item.type, path: item.path }))
    : [];

  const snapshot: SourceSnapshot = {
    fetchedAt: new Date().toISOString(),
    htmlUrl: repo.html_url,
    description: repo.description ?? "",
    language: repo.language ?? null,
    topics: repo.topics ?? [],
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    pushedAt: repo.pushed_at ?? null,
    license: repo.license?.spdx_id ?? null,
    homepage: repo.homepage ?? null,
    readmeExcerpt: readme.slice(0, 480),
    rootEntries,
  };

  return {
    sourceKind: "github",
    externalId: ownerRepo,
    sourcePrivate: Boolean(repo.private),
    suggestedTitle: repo.name || parsed.repo,
    suggestedSummary: (repo.description ?? "").slice(0, 400),
    primaryUrl: repo.html_url || `https://github.com/${ownerRepo}`,
    snapshot,
  };
}
