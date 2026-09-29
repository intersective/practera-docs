import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  applications,
  capabilities,
  objectives,
  initiatives,
  gaps,
  jiraSync,
  githubSync,
} from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      appsData,
      capsData,
      objsData,
      initsData,
      gapsData,
      jiraData,
      ghData,
    ] = await Promise.all([
      db.select().from(applications).orderBy(applications.id),
      db.select().from(capabilities).orderBy(capabilities.id),
      db.select().from(objectives).orderBy(objectives.id),
      db.select().from(initiatives).orderBy(initiatives.id),
      db.select().from(gaps).orderBy(gaps.id),
      db.select().from(jiraSync).orderBy(jiraSync.id),
      db.select().from(githubSync).orderBy(githubSync.id),
    ]);

    const payload = {
      version: '1',
      exportedAt: new Date().toISOString(),
      data: {
        applications: appsData,
        capabilities: capsData,
        objectives: objsData,
        initiatives: initsData,
        gaps: gapsData,
        jiraSync: jiraData,
        githubSync: ghData,
      },
    };

    const filename = `practera-roadmap-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
