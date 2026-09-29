import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { db } from '@/db';
import { applications, capabilities } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { analyzeAllApplicationCapabilities } from '@/services/ai.service';
import { readAllClaudeMds } from '@/services/capability.service';

export const dynamic = 'force-dynamic';

type CapabilityItem = {
  name: string;
  category: string;
  description: string;
  maturity: string;
  gaps?: string | null;
  integrations?: string | null;
};

type AppCapabilities = {
  applicationSlug: string;
  capabilities: CapabilityItem[];
};

/** GET: report how many capabilities are currently in the database */
export async function GET() {
  try {
    const [{ total }] = await db
      .select({ total: count() })
      .from(capabilities);

    const appRows = await db
      .select({ applicationId: capabilities.applicationId })
      .from(capabilities)
      .groupBy(capabilities.applicationId);

    return NextResponse.json({
      exists: total > 0,
      apps: appRows.length,
      capabilities: total,
    });
  } catch {
    return NextResponse.json({ exists: false, apps: 0, capabilities: 0 });
  }
}

const CAPABILITIES_FILE = path.join(process.cwd(), 'src', 'data', 'capabilities.json');

/** POST: load capabilities from JSON seed file if it exists, otherwise run AI analysis */
export async function POST() {
  try {
    // ── Path A: load from pre-generated JSON file (no AI cost) ──────────────
    if (fs.existsSync(CAPABILITIES_FILE)) {
      const results: AppCapabilities[] = JSON.parse(fs.readFileSync(CAPABILITIES_FILE, 'utf-8'));
      const stats: Record<string, number> = {};

      for (const result of results) {
        const [app] = await db.select().from(applications).where(eq(applications.slug, result.applicationSlug));
        if (!app) { stats[result.applicationSlug] = 0; continue; }

        await db.delete(capabilities).where(eq(capabilities.applicationId, app.id));
        if (result.capabilities.length > 0) {
          await db.insert(capabilities).values(
            result.capabilities.map((cap) => ({
              applicationId: app.id,
              name: cap.name,
              category: cap.category,
              description: cap.description,
              maturity: cap.maturity,
              gaps: cap.gaps ?? null,
              integrations: cap.integrations ?? null,
            })),
          );
        }
        stats[result.applicationSlug] = result.capabilities.length;
      }

      const totalCapabilities = Object.values(stats).reduce((s, n) => s + n, 0);
      return NextResponse.json({ ok: true, source: 'file', totalCapabilities });
    }

    // ── Path B: no file — run AI analysis on CLAUDE.md files ────────────────
    const claudeMds = readAllClaudeMds();
    if (claudeMds.length === 0) {
      return NextResponse.json(
        { error: 'No capabilities.json file and no CLAUDE.md files found. Check WORKSPACE_ROOT.' },
        { status: 400 },
      );
    }

    const results = await analyzeAllApplicationCapabilities(claudeMds);
    let totalCapabilities = 0;

    for (const result of results) {
      const [app] = await db.select().from(applications).where(eq(applications.slug, result.applicationSlug));
      if (!app) continue;

      await db.delete(capabilities).where(eq(capabilities.applicationId, app.id));
      if (result.capabilities.length > 0) {
        await db.insert(capabilities).values(
          result.capabilities.map((cap) => ({
            applicationId: app.id,
            name: cap.name,
            category: cap.category,
            description: cap.description,
            maturity: cap.maturity,
            gaps: cap.gaps ?? null,
            integrations: cap.integrations ?? null,
          })),
        );
        totalCapabilities += result.capabilities.length;
      }
    }

    return NextResponse.json({ ok: true, source: 'ai', analyzed: results.length, totalCapabilities });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
