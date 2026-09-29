import { db } from '@/db';
import { initiatives } from '@/db/schema';
import {
  customerStatusLabel,
  groupPublishable,
  partitionCustomerInitiatives,
  renderCustomerRoadmap,
} from '@/lib/customer-roadmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CustomerPreviewPage() {
  let rows: Awaited<ReturnType<typeof loadInitiatives>> = [];
  let error: string | null = null;
  try {
    rows = await loadInitiatives();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const { publishable, blocked } = partitionCustomerInitiatives(rows);
  const groups = groupPublishable(rows);
  const markdown = renderCustomerRoadmap(rows);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Customer preview</h2>
        <p className="text-sm text-gray-500 mt-1">
          This is the public What’s coming page. Assignees, effort, Jira, GitHub, and the internal
          description stay off it. Publishing writes{' '}
          <code className="text-xs">docs/whats-coming.md</code> when you run{' '}
          <code className="text-xs">npm run publish:customer</code> from <code className="text-xs">roadmap/</code>.
          The Support Centre shows that file after it is committed and deployed.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <Card className="border-amber-300 dark:border-amber-700">
        <CardHeader>
          <CardTitle>What’s coming</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 rounded-lg px-3 py-2">
            Provisional. Dates and scope on this page are not a commitment. They can change.
          </p>
          {publishable.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing is published for customers yet.</p>
          ) : (
            groups.map((group) => {
              return (
                <section key={`${group.year}-${group.quarter}`}>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{group.heading}</h3>
                  <ul className="space-y-3">
                    {group.items.map((item) => (
                      <li key={`${item.year}-${item.name}`}>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.customerSummary}</p>
                        <p className="text-xs text-gray-500 mt-1">Status: {customerStatusLabel(item.status)}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marked visible, not published ({blocked.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {blocked.length === 0 ? (
            <p className="text-sm text-gray-500">Every visible initiative can be published.</p>
          ) : (
            <ul className="space-y-3">
              {blocked.map((item) => (
                <li key={`${item.year}-${item.name}`} className="text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                  <span className="text-gray-500"> · {item.year}</span>
                  <ul className="mt-1 text-amber-800 dark:text-amber-200 list-disc pl-5">
                    {item.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-gray-500 mt-4">
            Set the customer summary and visibility on an{' '}
            <Link href="/initiatives" className="text-primary-600 hover:underline">initiative</Link>.
          </p>
        </CardContent>
      </Card>

      <details className="text-sm">
        <summary className="cursor-pointer text-gray-600 dark:text-gray-300">Markdown that will be committed</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-900 text-gray-100 p-4 text-xs whitespace-pre-wrap">{markdown}</pre>
      </details>
    </div>
  );
}

async function loadInitiatives() {
  return db.select().from(initiatives);
}
