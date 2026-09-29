import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, capabilities } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { analyzeApplicationCapabilities, analyzeAllApplicationCapabilities } from '@/services/ai.service';
import { readClaudeMd, readAllClaudeMds } from '@/services/capability.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicationSlug, all } = body;

    if (all) {
      // Analyze all apps
      const claudeMds = readAllClaudeMds();
      if (claudeMds.length === 0) {
        return NextResponse.json({ error: 'No CLAUDE.md files found. Check WORKSPACE_ROOT.' }, { status: 400 });
      }

      const results = await analyzeAllApplicationCapabilities(claudeMds);
      const stored = [];

      for (const result of results) {
        const [app] = await db.select().from(applications).where(eq(applications.slug, result.applicationSlug));
        if (!app) continue;

        // Delete existing capabilities for this app
        await db.delete(capabilities).where(eq(capabilities.applicationId, app.id));

        // Insert new capabilities
        const inserted = await db
          .insert(capabilities)
          .values(
            result.capabilities.map((cap) => ({
              applicationId: app.id,
              name: cap.name,
              category: cap.category,
              description: cap.description,
              maturity: cap.maturity,
              gaps: cap.gaps || null,
              integrations: cap.integrations || null,
            })),
          )
          .returning();

        stored.push({ app: result.applicationSlug, count: inserted.length });
      }

      return NextResponse.json({ analyzed: results.length, stored });
    }

    if (!applicationSlug) {
      return NextResponse.json({ error: 'applicationSlug or all=true required' }, { status: 400 });
    }

    const claudeMd = readClaudeMd(applicationSlug);
    if (!claudeMd) {
      return NextResponse.json({ error: `CLAUDE.md not found for ${applicationSlug}` }, { status: 404 });
    }

    const result = await analyzeApplicationCapabilities(applicationSlug, claudeMd);

    const [app] = await db.select().from(applications).where(eq(applications.slug, applicationSlug));
    if (!app) {
      return NextResponse.json({ error: `Application ${applicationSlug} not in database` }, { status: 404 });
    }

    // Delete and re-insert capabilities
    await db.delete(capabilities).where(eq(capabilities.applicationId, app.id));
    const inserted = await db
      .insert(capabilities)
      .values(
        result.capabilities.map((cap) => ({
          applicationId: app.id,
          name: cap.name,
          category: cap.category,
          description: cap.description,
          maturity: cap.maturity,
          gaps: cap.gaps || null,
          integrations: cap.integrations || null,
        })),
      )
      .returning();

    return NextResponse.json({ applicationSlug, capabilities: inserted.length, data: inserted });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
