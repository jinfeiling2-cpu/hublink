export type Visibility = "public" | "personal";

export type ContributionReviewStatus = "system_verified" | "owner_unconfirmed" | "owner_confirmed";

export type LayerId = "placement" | "recognition" | "account" | "internal" | "exit";

export type MeasureKey = "time" | "scale" | "importance" | "centrality" | "degree";

export type EdgeGroup = "composition" | "evidence" | "course" | "source";

export type ExitLink = {
  label: string;
  url: string;
};

export type SourceSnapshot = {
  fetchedAt: string;
  revision?: string;
  branch?: string;
  htmlUrl?: string;
  description?: string;
  language?: string | null;
  topics?: string[];
  stars?: number;
  forks?: number;
  pushedAt?: string | null;
  license?: string | null;
  homepage?: string | null;
  readmeExcerpt?: string;
  rootEntries?: { name: string; type: string; path: string }[];
};

export type NodeRecord = {
  id: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  role: string;
  outcome: string;
  status: string;
  timeStart: string | null;
  timeEnd: string | null;
  scale: number;
  importance: number;
  centrality: number;
  visibility: Visibility;
  primaryUrl: string;
  exitLinks: ExitLink[];
  sourceKind: string;
  sourceExternalId: string;
  sourcePrivate: boolean;
  sourceSnapshot: SourceSnapshot | null;
  categoryIds: string[];
  contributionReview?: ContributionReviewStatus | null;
  createdAt: string;
  updatedAt: string;
};

export type EdgeRecord = {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  label: string;
  strength: number;
  sortOrder: number;
};

export type NodeInput = {
  type: string;
  title: string;
  summary: string;
  body: string;
  role: string;
  outcome: string;
  status: string;
  timeStart: string | null;
  timeEnd: string | null;
  scale: number;
  importance: number;
  centrality: number;
  visibility: Visibility;
  primaryUrl: string;
  exitLinks: ExitLink[];
  categoryIds: string[];
  sourceKind: string;
  sourceExternalId: string;
  sourcePrivate: boolean;
  sourceSnapshot: SourceSnapshot | null;
  contributionReview?: ContributionReviewStatus | null;
};

export type SourcePull = {
  sourceKind: string;
  externalId: string;
  sourcePrivate: boolean;
  suggestedTitle: string;
  suggestedSummary: string;
  primaryUrl: string;
  snapshot: SourceSnapshot;
};
