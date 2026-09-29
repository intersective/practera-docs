import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { initiatives } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { UpdateInitiativeSchema } from '@/types/dtos';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const [row] = await db.select().from(initiatives).where(eq(initiatives.id, id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json() as unknown;
  const parsed = UpdateInitiativeSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.') || 'field'}: ${i.message}`).join(', ');
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const [updated] = await db
    .update(initiatives)
    .set({
      ...parsed.data,
      // Mark as manually edited so future seeds don't overwrite
      manuallyEdited: 1,
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  await db.delete(initiatives).where(eq(initiatives.id, id));
  return NextResponse.json({ ok: true });
}
