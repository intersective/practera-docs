import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { initiatives, applications } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const year = url.searchParams.get('year');
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');

    let query = db
      .select({
        initiative: initiatives,
        application: {
          id: applications.id,
          name: applications.name,
          slug: applications.slug,
        },
      })
      .from(initiatives)
      .leftJoin(applications, eq(initiatives.applicationId, applications.id))
      .$dynamic();

    const data = await query.orderBy(initiatives.year, initiatives.startQuarter);

    // Apply filters in JS (drizzle dynamic conditions)
    const filtered = data.filter((row) => {
      if (year && row.initiative.year !== parseInt(year)) return false;
      if (category && row.initiative.category !== category) return false;
      if (status && row.initiative.status !== status) return false;
      return true;
    });

    return NextResponse.json(filtered);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
