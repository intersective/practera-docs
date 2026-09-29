import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jiraSync } from '@/db/schema';
import { fetchEpics } from '@/services/jira.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // Optional project key filter — omit to search all projects
    const projectKey: string | undefined = body.projectKey || undefined;

    // Fetch epics from Jira (all projects unless filtered)
    const allEpics = await fetchEpics(projectKey);

    // Upsert all fetched epics
    const results = [];
    for (const epic of allEpics) {
      const [upserted] = await db
        .insert(jiraSync)
        .values({
          epicKey: epic.key,
          summary: epic.summary,
          status: epic.status,
          assignee: epic.assignee,
          storyCount: epic.storyCount,
          doneCount: epic.doneCount,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: jiraSync.epicKey,
          set: {
            summary: epic.summary,
            status: epic.status,
            assignee: epic.assignee,
            storyCount: epic.storyCount,
            doneCount: epic.doneCount,
            lastSyncedAt: new Date(),
          },
        })
        .returning();
      results.push(upserted);
    }

    return NextResponse.json({ synced: results.length, epics: results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const data = await db.select().from(jiraSync).orderBy(jiraSync.lastSyncedAt);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
