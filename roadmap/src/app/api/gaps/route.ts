import { NextResponse } from 'next/server';
import { db } from '@/db';
import { gaps, objectives, applications } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const data = await db
      .select({
        gap: gaps,
        objective: { id: objectives.id, name: objectives.name },
        application: { id: applications.id, name: applications.name },
      })
      .from(gaps)
      .leftJoin(objectives, eq(gaps.objectiveId, objectives.id))
      .leftJoin(applications, eq(gaps.applicationId, applications.id))
      .orderBy(objectives.priority);

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
