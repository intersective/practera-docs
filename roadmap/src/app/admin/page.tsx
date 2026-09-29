import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ImportExportPanel } from '@/components/admin/ImportExportPanel';
import { SeedDataPanel } from '@/components/admin/SeedDataPanel';
import { IntegrationStatusPanel } from '@/components/admin/IntegrationStatusPanel';
import { InvestigatePanel } from '@/components/admin/InvestigatePanel';
import { db } from '@/db';
import { capabilities } from '@/db/schema';
import { count } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function getCapabilitiesStatus() {
  try {
    const [{ total }] = await db.select({ total: count() }).from(capabilities);
    const appRows = await db
      .select({ applicationId: capabilities.applicationId })
      .from(capabilities)
      .groupBy(capabilities.applicationId);
    return { exists: total > 0, apps: appRows.length, capabilities: Number(total) };
  } catch {
    return { exists: false, apps: 0, capabilities: 0 };
  }
}

export default async function AdminPage() {
  const capabilitiesFileStatus = await getCapabilitiesStatus();

  return (
    <div className="space-y-6 max-w-2xl">

      <Card>
        <CardHeader>
          <CardTitle>Seed Data</CardTitle>
        </CardHeader>
        <CardContent>
          <SeedDataPanel capabilitiesFileStatus={capabilitiesFileStatus} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import / Export</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportExportPanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CLI Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-xs space-y-1 text-gray-700 dark:text-gray-300">
            <p><span className="text-green-600"># Seed all data (apps + historical + 2026 + 2027 objectives)</span></p>
            <p>npm run seed:roadmap</p>
            <p className="mt-2"><span className="text-green-600"># Generate capabilities via AI, save to src/data/capabilities.json</span></p>
            <p>npm run seed:capabilities</p>
            <p className="mt-2"><span className="text-green-600"># Load capabilities from file (no AI / no cost)</span></p>
            <p>npm run seed:capabilities -- --from-file</p>
            <p className="mt-2"><span className="text-green-600"># Sync Jira + GitHub</span></p>
            <p>npm run sync</p>
            <p className="mt-2"><span className="text-green-600"># Export snapshot to file</span></p>
            <p>npm run export</p>
            <p className="mt-2"><span className="text-green-600"># Import from snapshot</span></p>
            <p>npm run import -- --file ./exports/practera-roadmap-2026-08-09.json</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations &amp; Sync</CardTitle>
        </CardHeader>
        <CardContent>
          <IntegrationStatusPanel />
          <div className="border-t border-gray-100 dark:border-gray-800 mt-2" />
          <InvestigatePanel />
        </CardContent>
      </Card>

    </div>
  );
}
