import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { initiatives } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const AcceptJiraSchema = z.object({
  type: z.literal('jira'),
  initiativeId: z.number().int().positive(),
  epicKey: z.string().min(1),
});

const AcceptGithubSchema = z.object({
  type: z.literal('github'),
  initiativeId: z.number().int().positive(),
  prUrl: z.string().url(),
  prTitle: z.string(),
});

const AcceptSchema = z.discriminatedUnion('type', [AcceptJiraSchema, AcceptGithubSchema]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AcceptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.type === 'jira') {
      const [updated] = await db
        .update(initiatives)
        .set({ jiraEpicKey: data.epicKey, manuallyEdited: 1, updatedAt: new Date() })
        .where(eq(initiatives.id, data.initiativeId))
        .returning({ id: initiatives.id, name: initiatives.name, jiraEpicKey: initiatives.jiraEpicKey });

      return NextResponse.json({ ok: true, updated });
    }

    if (data.type === 'github') {
      // Fetch existing linked PRs (JSON array of strings)
      const [row] = await db
        .select({ linkedPrs: initiatives.linkedPrs })
        .from(initiatives)
        .where(eq(initiatives.id, data.initiativeId));

      let existing: string[] = [];
      if (row?.linkedPrs) {
        try { existing = JSON.parse(row.linkedPrs); } catch { /* ignore */ }
      }

      if (!existing.includes(data.prUrl)) {
        existing.push(data.prUrl);
      }

      const [updated] = await db
        .update(initiatives)
        .set({ linkedPrs: JSON.stringify(existing), manuallyEdited: 1, updatedAt: new Date() })
        .where(eq(initiatives.id, data.initiativeId))
        .returning({ id: initiatives.id, name: initiatives.name, linkedPrs: initiatives.linkedPrs });

      return NextResponse.json({ ok: true, updated });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
