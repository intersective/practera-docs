import { db } from '@/db';
import { initiatives } from '@/db/schema';
import { Timeline } from '@/components/roadmap/Timeline';
import { Initiative } from '@/types/entities';

export const dynamic = 'force-dynamic';

export default async function RoadmapPage() {
  let data: Initiative[] = [];

  try {
    data = await db.select().from(initiatives).orderBy(initiatives.year, initiatives.startQuarter) as Initiative[];
  } catch {
    // DB may not be migrated yet
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Full platform timeline from 2022 through 2027. Use filters to focus on a specific year, category, or status.
        Run <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">npm run seed:roadmap</code> to load historical data.
      </p>
      <Timeline initiatives={data} years={[2022, 2023, 2024, 2025, 2026, 2027]} />
    </div>
  );
}
