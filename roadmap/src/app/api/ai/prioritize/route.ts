import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { objectives, initiatives, capabilities, applications, gaps } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { prioritizeInitiatives } from '@/services/ai.service';
import { AIPrioritizeSchema } from '@/types/dtos';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AIPrioritizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { year, objectiveIds } = parsed.data;

    // Load objectives
    let objectiveList;
    if (objectiveIds && objectiveIds.length > 0) {
      objectiveList = await db.select().from(objectives).where(inArray(objectives.id, objectiveIds));
    } else {
      objectiveList = await db.select().from(objectives).where(eq(objectives.year, year));
    }

    if (objectiveList.length === 0) {
      return NextResponse.json({ error: `No objectives found for ${year}. Add objectives first.` }, { status: 400 });
    }

    // Load initiatives for the target year
    const initiativeList = await db.select().from(initiatives).where(eq(initiatives.year, year));

    // Load capabilities with app names
    const capabilityList = await db
      .select({ cap: capabilities, app: { name: applications.name } })
      .from(capabilities)
      .leftJoin(applications, eq(capabilities.applicationId, applications.id));

    const result = await prioritizeInitiatives({
      objectives: objectiveList.map((o) => ({
        name: o.name,
        description: o.description,
        priority: o.priority,
      })),
      initiatives: initiativeList.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        type: i.type,
        status: i.status,
        year: i.year,
      })),
      capabilities: capabilityList.map(({ cap, app }) => ({
        applicationName: app?.name ?? 'Unknown',
        name: cap.name,
        maturity: cap.maturity,
        gaps: cap.gaps,
      })),
    });

    // Save AI scores back to initiatives
    for (const scored of result.initiatives) {
      if (scored.id) {
        await db
          .update(initiatives)
          .set({ aiPriorityScore: scored.score, aiRationale: scored.rationale })
          .where(eq(initiatives.id, scored.id));
      }
    }

    // Save identified gaps
    if (result.gaps.length > 0) {
      // Clear old AI-generated gaps for these objectives
      const objectiveIdsToUse = objectiveList.map((o) => o.id);
      if (objectiveIdsToUse.length > 0) {
        await db.delete(gaps).where(inArray(gaps.objectiveId, objectiveIdsToUse));
      }

      for (const gap of result.gaps) {
        const objective = objectiveList.find((o) => o.name === gap.objectiveName);
        if (!objective) continue;

        let applicationId: number | undefined;
        if (gap.applicationName) {
          const [app] = await db.select().from(applications).where(eq(applications.name, gap.applicationName));
          applicationId = app?.id;
        }

        await db.insert(gaps).values({
          objectiveId: objective.id,
          applicationId: applicationId ?? null,
          description: gap.description,
          severity: gap.severity,
          suggestedInitiatives: gap.suggestedInitiatives,
        });
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
