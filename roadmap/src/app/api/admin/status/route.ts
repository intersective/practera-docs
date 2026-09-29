import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface ServiceStatus {
  ok: boolean;
  label: string;
  detail?: string;
}

async function checkGitHub(): Promise<ServiceStatus> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, label: 'GitHub', detail: 'GITHUB_TOKEN not set' };
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'practera-roadmap' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.status === 401) return { ok: false, label: 'GitHub', detail: 'Token invalid or expired (401)' };
    if (!res.ok) return { ok: false, label: 'GitHub', detail: `HTTP ${res.status}` };
    const data = await res.json() as { login?: string };
    return { ok: true, label: 'GitHub', detail: data.login };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('timeout');
    return { ok: false, label: 'GitHub', detail: isTimeout ? 'Timeout — check network' : msg };
  }
}

async function checkJira(): Promise<ServiceStatus> {
  const token = process.env.ATLASSIAN_TOKEN;
  const email = process.env.ATLASSIAN_EMAIL;
  const baseUrl = process.env.ATLASSIAN_BASE_URL;
  if (!token || !email || !baseUrl) {
    return { ok: false, label: 'Jira', detail: 'ATLASSIAN_TOKEN / EMAIL / BASE_URL not set' };
  }
  try {
    const credentials = Buffer.from(`${email}:${token}`).toString('base64');
    const res = await fetch(`${baseUrl}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.status === 401) return { ok: false, label: 'Jira', detail: 'Token invalid or expired (401)' };
    if (!res.ok) return { ok: false, label: 'Jira', detail: `HTTP ${res.status}` };
    const data = await res.json() as { emailAddress?: string };
    return { ok: true, label: 'Jira', detail: data.emailAddress };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('timeout');
    return { ok: false, label: 'Jira', detail: isTimeout ? 'Timeout — check network' : msg };
  }
}

async function checkOpenAI(): Promise<ServiceStatus> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, label: 'OpenAI', detail: 'OPENAI_API_KEY not set' };
  // Accept both sk- and sk-svcacct- prefixes
  if (!key.startsWith('sk-')) {
    return { ok: false, label: 'OpenAI', detail: 'Key format invalid (expected sk-…)' };
  }
  try {
    // Use 8s — OpenAI's models endpoint can be slow from inside Docker
    const res = await fetch('https://api.openai.com/v1/models?limit=1', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401) return { ok: false, label: 'OpenAI', detail: 'Invalid or expired key (401)' };
    if (res.status === 403) return { ok: false, label: 'OpenAI', detail: 'Key lacks model-list permission (403)' };
    if (res.status === 429) return { ok: true, label: 'OpenAI', detail: 'Key valid (rate-limited on status check)' };
    if (!res.ok) return { ok: false, label: 'OpenAI', detail: `HTTP ${res.status}` };
    return { ok: true, label: 'OpenAI', detail: 'Key valid' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('timeout');
    return { ok: false, label: 'OpenAI', detail: isTimeout ? 'Timeout (8s) — check Docker network / firewall' : msg };
  }
}

const checkers: Record<string, () => Promise<ServiceStatus>> = {
  github: checkGitHub,
  jira:   checkJira,
  openai: checkOpenAI,
};

// GET /api/admin/status?service=github  — check a single service
// GET /api/admin/status                 — check all (waits for slowest)
export async function GET(req: NextRequest) {
  const service = req.nextUrl.searchParams.get('service');

  if (service) {
    const checker = checkers[service];
    if (!checker) {
      return NextResponse.json({ error: `Unknown service: ${service}` }, { status: 400 });
    }
    const result = await checker();
    return NextResponse.json(result);
  }

  const [github, jira, openai] = await Promise.allSettled([
    checkGitHub(),
    checkJira(),
    checkOpenAI(),
  ]);
  const r = (x: PromiseSettledResult<ServiceStatus>): ServiceStatus =>
    x.status === 'fulfilled' ? x.value : { ok: false, label: '?', detail: String(x.reason) };

  return NextResponse.json({ github: r(github), jira: r(jira), openai: r(openai) });
}
