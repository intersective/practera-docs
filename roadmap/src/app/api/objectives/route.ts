import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { objectives } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CreateObjectiveSchema } from '@/types/dtos';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const year = url.searchParams.get('year');

    let data;
    if (year) {
      data = await db.select().from(objectives).where(eq(objectives.year, parseInt(year))).orderBy(objectives.priority);
    } else {
      data = await db.select().from(objectives).orderBy(objectives.year, objectives.priority);
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateObjectiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const [created] = await db.insert(objectives).values(parsed.data).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
