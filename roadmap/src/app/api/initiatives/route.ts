import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { initiatives } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CreateInitiativeSchema } from '@/types/dtos';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const year = url.searchParams.get('year');
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');

    let query = db.select().from(initiatives).$dynamic();

    const conditions = [];
    if (year) conditions.push(eq(initiatives.year, parseInt(year)));
    if (status) conditions.push(eq(initiatives.status, status));
    if (category) conditions.push(eq(initiatives.category, category));

    const data = await query.orderBy(initiatives.year, initiatives.startQuarter);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateInitiativeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const [created] = await db.insert(initiatives).values(parsed.data).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
