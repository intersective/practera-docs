import { Octokit } from '@octokit/rest';

const GITHUB_ORG = process.env.GITHUB_ORG || 'intersective';

function getClient(): Octokit {
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

export interface RepoStats {
  repo: string;
  openPrs: number;
  lastRelease?: string;
  lastReleaseDate?: Date;
  openIssues: number;
  defaultBranch: string;
}

export async function fetchRepoStats(repoName: string): Promise<RepoStats> {
  const octokit = getClient();

  const [repoData, prsData, releasesData] = await Promise.allSettled([
    octokit.repos.get({ owner: GITHUB_ORG, repo: repoName }),
    octokit.pulls.list({ owner: GITHUB_ORG, repo: repoName, state: 'open', per_page: 100 }),
    octokit.repos.listReleases({ owner: GITHUB_ORG, repo: repoName, per_page: 1 }),
  ]);

  const repo = repoData.status === 'fulfilled' ? repoData.value.data : null;
  const prs = prsData.status === 'fulfilled' ? prsData.value.data : [];
  const releases = releasesData.status === 'fulfilled' ? releasesData.value.data : [];

  const latestRelease = releases[0];

  return {
    repo: repoName,
    openPrs: prs.length,
    lastRelease: latestRelease?.tag_name,
    lastReleaseDate: latestRelease?.published_at ? new Date(latestRelease.published_at) : undefined,
    openIssues: repo?.open_issues_count ?? 0,
    defaultBranch: repo?.default_branch ?? 'main',
  };
}

export async function fetchAllRepoStats(repoNames: string[]): Promise<RepoStats[]> {
  const results = await Promise.allSettled(repoNames.map((r) => fetchRepoStats(r)));
  return results
    .map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        repo: repoNames[i],
        openPrs: 0,
        openIssues: 0,
        defaultBranch: 'main',
      } as RepoStats;
    });
}

export async function fetchOrgRepos(): Promise<string[]> {
  const octokit = getClient();

  const response = await octokit.repos.listForOrg({
    org: GITHUB_ORG,
    type: 'all',
    per_page: 100,
    sort: 'updated',
  });

  return response.data.map((r) => r.name);
}
