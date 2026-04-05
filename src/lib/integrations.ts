import { api } from "./api";

export interface IntegrationRepo {
  id: string;
  provider: "github" | "gitlab";
  account: string;
  name: string;
  defaultBranch: string;
  branches?: string[];
  language?: string;
  connectedAt?: string;
}

const FALLBACK_REPOS: IntegrationRepo[] = [
  {
    id: "github:quantum-ops/api-gateway",
    provider: "github",
    account: "quantum-ops",
    name: "api-gateway",
    defaultBranch: "main",
    branches: ["main", "staging", "release"],
    language: "Node",
    connectedAt: "2d ago",
  },
  {
    id: "github:quantum-ops/ml-inference",
    provider: "github",
    account: "quantum-ops",
    name: "ml-inference",
    defaultBranch: "main",
    branches: ["main", "canary"],
    language: "Python",
    connectedAt: "4d ago",
  },
  {
    id: "gitlab:quantum-ops/worker-pool",
    provider: "gitlab",
    account: "quantum-ops",
    name: "worker-pool",
    defaultBranch: "main",
    branches: ["main", "hotfix"],
    language: "Go",
    connectedAt: "1w ago",
  },
];

export async function listIntegrationRepos(): Promise<IntegrationRepo[]> {
  try {
    const { data } = await api.get("/integrations/repos");
    const repos = (data?.items ?? data ?? []) as IntegrationRepo[];
    if (!Array.isArray(repos) || repos.length === 0) return FALLBACK_REPOS;
    return repos;
  } catch {
    return FALLBACK_REPOS;
  }
}

