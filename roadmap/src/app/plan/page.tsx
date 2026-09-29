import { db } from '@/db';
import { objectives } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PlanClientSection } from './PlanClientSection';

export const dynamic = 'force-dynamic';

const PLAN_YEAR = 2027;

async function getObjectives() {
  try {
    return await db
      .select()
      .from(objectives)
      .where(eq(objectives.year, PLAN_YEAR))
      .orderBy(objectives.priority, objectives.name);
  } catch {
    return [];
  }
}

export default async function PlanPage() {
  const existingObjectives = await getObjectives();

  return <PlanClientSection initialObjectives={existingObjectives} year={PLAN_YEAR} />;
}
