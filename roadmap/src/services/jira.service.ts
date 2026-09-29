const ATLASSIAN_BASE_URL = process.env.ATLASSIAN_BASE_URL || 'https://practera.atlassian.net';
const ATLASSIAN_EMAIL = process.env.ATLASSIAN_EMAIL || '';
const ATLASSIAN_TOKEN = process.env.ATLASSIAN_TOKEN || '';

function authHeader(): string {
  const credentials = Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_TOKEN}`).toString('base64');
  return `Basic ${credentials}`;
}

export interface JiraEpic {
  key: string;
  summary: string;
  status: string;
  assignee?: string;
  storyCount: number;
  doneCount: number;
}

export async function fetchEpics(projectKey?: string): Promise<JiraEpic[]> {
  if (!ATLASSIAN_TOKEN || !ATLASSIAN_EMAIL) {
    throw new Error('Atlassian credentials not configured (ATLASSIAN_EMAIL, ATLASSIAN_TOKEN)');
  }

  // When no project key provided, search all projects
  const jql = projectKey
    ? `project = ${projectKey} AND issuetype = Epic ORDER BY updated DESC`
    : `issuetype = Epic ORDER BY updated DESC`;
  const url = `${ATLASSIAN_BASE_URL}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=200&fields=summary,status,assignee`;

  const response = await fetch(url, {
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    issues: {
      key: string;
      fields: {
        summary: string;
        status: { name: string };
        assignee?: { displayName: string };
      };
    }[];
  };

  // Fetch story counts concurrently (batches of 20) to avoid sequential N+1 slowness
  const BATCH = 20;
  const epics: JiraEpic[] = [];
  for (let i = 0; i < data.issues.length; i += BATCH) {
    const batch = data.issues.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      batch.map(async (issue) => {
        const storyData = await fetchEpicStories(issue.key);
        return {
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          assignee: issue.fields.assignee?.displayName,
          storyCount: storyData.total,
          doneCount: storyData.done,
        };
      }),
    );
    for (const r of settled) {
      if (r.status === 'fulfilled') epics.push(r.value);
    }
  }

  return epics;
}

async function fetchEpicStories(epicKey: string): Promise<{ total: number; done: number }> {
  const jql = `"Epic Link" = ${epicKey} OR parent = ${epicKey}`;
  const url = `${ATLASSIAN_BASE_URL}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=200&fields=status`;

  const response = await fetch(url, {
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
  });

  if (!response.ok) return { total: 0, done: 0 };

  const data = (await response.json()) as {
    total: number;
    issues: { fields: { status: { statusCategory: { key: string } } } }[];
  };

  const done = data.issues.filter((i) => i.fields.status.statusCategory.key === 'done').length;
  return { total: data.total, done };
}

export async function fetchEpic(epicKey: string): Promise<JiraEpic | null> {
  if (!ATLASSIAN_TOKEN || !ATLASSIAN_EMAIL) return null;

  const url = `${ATLASSIAN_BASE_URL}/rest/api/3/issue/${epicKey}?fields=summary,status,assignee`;
  const response = await fetch(url, {
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    key: string;
    fields: { summary: string; status: { name: string }; assignee?: { displayName: string } };
  };

  const storyData = await fetchEpicStories(epicKey);
  return {
    key: data.key,
    summary: data.fields.summary,
    status: data.fields.status.name,
    assignee: data.fields.assignee?.displayName,
    storyCount: storyData.total,
    doneCount: storyData.done,
  };
}
