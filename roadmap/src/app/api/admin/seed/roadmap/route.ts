import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { db } from '@/db';
import { applications, initiatives, objectives } from '@/db/schema';

export const dynamic = 'force-dynamic';

// Resolve data files relative to the project root (works in Docker + local dev)
const DATA_DIR = path.join(process.cwd(), 'src', 'data');

function readJson<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8')) as T;
}

export async function POST() {
  try {
    const appsData = readJson<Record<string, unknown>[]>('applications.json');
    const historicalData = readJson<Record<string, unknown>[]>('roadmap-2022-2025.json');
    const initiatives2026 = readJson<Record<string, unknown>[]>('initiatives-2026.json');
    const objectives2027 = readJson<Record<string, unknown>[]>('objectives-2027.json');

    const stats: Record<string, number> = {};

    // Applications — upsert on slug
    for (const app of appsData) {
      await db
        .insert(applications)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values(app as any)
        .onConflictDoUpdate({
          target: applications.slug,
          set: {
            name: applications.name,
            description: applications.description,
            repoUrl: applications.repoUrl,
            techStack: applications.techStack,
            layer: applications.layer,
            status: applications.status,
            updatedAt: applications.updatedAt,
          },
        });
    }
    stats.applications = appsData.length;

    // Historical initiatives — insert, skip duplicates
    let histCount = 0;
    for (const item of historicalData) {
      await db
        .insert(initiatives)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values({
          name: (item.name as string),
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
        .onConflictDoNothing()
        .catch(() => {});
      histCount++;
    }
    stats.historicalInitiatives = histCount;

    // 2026 initiatives
    let count2026 = 0;
    for (const initiative of initiatives2026) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.insert(initiatives).values(initiative as any).onConflictDoNothing().catch(() => {});
      count2026++;
    }
    stats.initiatives2026 = count2026;

    // 2027 objectives — upsert on (name, year) so re-seeding never creates duplicates
    let count2027 = 0;
    for (const obj of objectives2027) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const o = obj as any;
      await db
        .insert(objectives)
        .values(o)
        .onConflictDoUpdate({
          target: [objectives.name, objectives.year],
          set: {
            description: objectives.description,
            priority: objectives.priority,
            metrics: objectives.metrics,
            updatedAt: objectives.updatedAt,
          },
        })
        .catch(() => {});
      count2027++;
    }
    stats.objectives2027 = count2027;

    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
