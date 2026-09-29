import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { db } from '@/db';
import { applications } from '@/db/schema';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');

export async function POST() {
  try {
    const appsData = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'applications.json'), 'utf-8')
    ) as Record<string, unknown>[];

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

    return NextResponse.json({ ok: true, stats: { applications: appsData.length } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
