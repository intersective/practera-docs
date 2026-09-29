import fs from 'fs';
import path from 'path';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || path.join(process.cwd(), '..');

const REPO_CLAUDE_MAP: Record<string, string> = {
  'practera-admin': 'practera-admin/CLAUDE.md',
  'practera-app': 'practera-app/CLAUDE.md',
  'practera-login-app': 'practera-login-app/CLAUDE.md',
  'practera-login-api': 'practera-login-api/CLAUDE.md',
  'practera-graphql-api': 'practera-graphql-api/CLAUDE.md',
  'practera-services': 'practera-services/CLAUDE.md',
  'practera-tusd': 'practera-tusd/CLAUDE.md',
  'practera-mcp-server': 'practera-mcp-server/CLAUDE.md',
  'practera-test-suite': 'practera-test-suite/CLAUDE.md',
  'practera-devops-center': 'practera-devops-center/CLAUDE.md',
  'project-hub': 'project-hub/CLAUDE.md',
  'project-brief-ai-generator': 'project-brief-ai-generator/CLAUDE.md',
};

export function readClaudeMd(applicationSlug: string): string | null {
  const relativePath = REPO_CLAUDE_MAP[applicationSlug];
  if (!relativePath) return null;

  const fullPath = path.join(WORKSPACE_ROOT, relativePath);
  try {
    return fs.readFileSync(fullPath, 'utf-8');
  } catch {
    return null;
  }
}

export function readAllClaudeMds(): { slug: string; claudeMdContent: string }[] {
  const results: { slug: string; claudeMdContent: string }[] = [];

  for (const [slug] of Object.entries(REPO_CLAUDE_MAP)) {
    const content = readClaudeMd(slug);
    if (content) {
      results.push({ slug, claudeMdContent: content });
    }
  }

  return results;
}

export function getWorkspaceRoot(): string {
  return WORKSPACE_ROOT;
}

export function listAvailableRepos(): { slug: string; available: boolean; path: string }[] {
  return Object.entries(REPO_CLAUDE_MAP).map(([slug, relativePath]) => {
    const fullPath = path.join(WORKSPACE_ROOT, relativePath);
    return {
      slug,
      available: fs.existsSync(fullPath),
      path: fullPath,
    };
  });
}
