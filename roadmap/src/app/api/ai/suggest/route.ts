import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { objectives, initiatives, capabilities, applications } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { suggestInitiatives } from '@/services/ai.service';
import { AISuggestSchema } from '@/types/dtos';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AISuggestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { year, objectiveIds, count } = parsed.data;

    let objectiveList;
    if (objectiveIds && objectiveIds.length > 0) {
      objectiveList = await db.select().from(objectives).where(inArray(objectives.id, objectiveIds));
    } else {
      objectiveList = await db.select().from(objectives).where(eq(objectives.year, year));
    }

    if (objectiveList.length === 0) {
      return NextResponse.json({ error: `No objectives found for ${year}.` }, { status: 400 });
    }

    const capabilityList = await db
      .select({ cap: capabilities, app: { name: applications.name } })
      .from(capabilities)
      .leftJoin(applications, eq(capabilities.applicationId, applications.id));

    const existingInitiatives = await db
      .select({ name: initiatives.name, status: initiatives.status, year: initiatives.year })
      .from(initiatives)
      .where(eq(initiatives.year, year));

    const result = await suggestInitiatives({
      year,
      objectives: objectiveList.map((o) => ({ name: o.name, description: o.description, priority: o.priority })),
      capabilities: capabilityList.map(({ cap, app }) => ({
        applicationName: app?.name ?? 'Unknown',
        name: cap.name,
        maturity: cap.maturity,
        gaps: cap.gaps,
      })),
      existingInitiatives,
      count,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
