import { NextResponse } from 'next/server';
import { db } from '@/db';
import { initiatives, jiraSync } from '@/db/schema';
import { runInvestigation } from '@/services/investigate.service';

export async function POST() {
  try {
    const [allInitiatives, syncedEpics] = await Promise.all([
      db.select({
        id: initiatives.id,
        name: initiatives.name,
        description: initiatives.description,
        status: initiatives.status,
        jiraEpicKey: initiatives.jiraEpicKey,
        year: initiatives.year,
      }).from(initiatives),

      db.select({
        epicKey: jiraSync.epicKey,
        summary: jiraSync.summary,
        status: jiraSync.status,
        storyCount: jiraSync.storyCount,
        doneCount: jiraSync.doneCount,
      }).from(jiraSync),
    ]);

    // Build lookup map for synced epic data
    const syncedMap = new Map(
      syncedEpics.map(e => [
        e.epicKey,
        {
          summary: e.summary ?? '',
          status: e.status ?? 'Unknown',
          storyCount: e.storyCount,
          doneCount: e.doneCount,
        },
      ]),
    );

    const result = await runInvestigation(allInitiatives, syncedMap);

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
