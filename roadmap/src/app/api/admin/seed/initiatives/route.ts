import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { db } from '@/db';
import { initiatives, objectives } from '@/db/schema';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');

export async function POST() {
  try {
    const historicalData = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'roadmap-2022-2025.json'), 'utf-8')
    ) as Record<string, unknown>[];

    const initiatives2026 = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'initiatives-2026.json'), 'utf-8')
    ) as Record<string, unknown>[];

    const objectives2027 = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'objectives-2027.json'), 'utf-8')
    ) as Record<string, unknown>[];

    let histInserted = 0, histSkipped = 0;
    for (const item of historicalData) {
      const result = await db
        .insert(initiatives)
        .values({
          name: item.name as string,
          description: (item.description as string) ?? null,
          type: (item.type as string) ?? 'feature',
          status: (item.status as string) ?? 'complete',
          category: (item.category as string) ?? 'PLATFORM',
          year: item.year as number,
          startQuarter: (item.startQuarter as string) ?? null,
          endQuarter: (item.endQuarter as string) ?? null,
          effort: (item.effort as string) ?? null,
          impact: (item.impact as number) ?? null,
        })
        // ON CONFLICT (name, year): only update seed-managed fields if the row
        // has NOT been manually edited. This prevents seeds from overwriting
        // user changes made through the UI.
        .onConflictDoUpdate({
          target: [initiatives.name, initiatives.year],
          set: {
            description: sql`CASE WHEN ${initiatives.manuallyEdited} = 0 THEN EXCLUDED.description ELSE ${initiatives.description} END`,
            type:         sql`CASE WHEN ${initiatives.manuallyEdited} = 0 THEN EXCLUDED.type ELSE ${initiatives.type} END`,
            status:       sql`CASE WHEN ${initiatives.manuallyEdited} = 0 THEN EXCLUDED.status ELSE ${initiatives.status} END`,
            category:     sql`CASE WHEN ${initiatives.manuallyEdited} = 0 THEN EXCLUDED.category ELSE ${initiatives.category} END`,
            effort:       sql`CASE WHEN ${initiatives.manuallyEdited} = 0 THEN EXCLUDED.effort ELSE ${initiatives.effort} END`,
            impact:       sql`CASE WHEN ${initiatives.manuallyEdited} = 0 THEN EXCLUDED.impact ELSE ${initiatives.impact} END`,
          },
          where: sql`${initiatives.manuallyEdited} = 0`,
        })
        .returning({ id: initiatives.id });
      if (result.length > 0) histInserted++; else histSkipped++;
    }

    let count2026Inserted = 0, count2026Skipped = 0;
    for (const item of initiatives2026) {
      const result = await db
        .insert(initiatives)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values(item as any)
        .onConflictDoUpdate({
          target: [initiatives.name, initiatives.year],
          set: {
            description: sql`CASE WHEN ${initiatives.manuallyEdited} = 0 THEN EXCLUDED.description ELSE ${initiatives.description} END`,
            type:         sql`CASE WHEN ${initiatives.manuallyEdited} = 0 THEN EXCLUDED.type ELSE ${initiatives.type} END`,
            status:       sql`CASE WHEN ${initiatives.manuallyEdited} = 0 THEN EXCLUDED.status ELSE ${initiatives.status} END`,
            category:     sql`CASE WHEN ${initiatives.manuallyEdited} = 0 THEN EXCLUDED.category ELSE ${initiatives.category} END`,
            effort:       sql`CASE WHEN ${initiatives.manuallyEdited} = 0 THEN EXCLUDED.effort ELSE ${initiatives.effort} END`,
            impact:       sql`CASE WHEN ${initiatives.manuallyEdited} = 0 THEN EXCLUDED.impact ELSE ${initiatives.impact} END`,
          },
          where: sql`${initiatives.manuallyEdited} = 0`,
        })
        .returning({ id: initiatives.id });
      if (result.length > 0) count2026Inserted++; else count2026Skipped++;
    }

    let count2027 = 0;
    for (const obj of objectives2027) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.insert(objectives).values(obj as any).onConflictDoNothing().catch(() => {});
      count2027++;
    }

    return NextResponse.json({
      ok: true,
      stats: {
        historicalInserted: histInserted,
        historicalProtected: histSkipped,
        initiatives2026Inserted: count2026Inserted,
        initiatives2026Protected: count2026Skipped,
        objectives2027: count2027,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
