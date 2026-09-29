'use client';

import { usePathname } from 'next/navigation';

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Platform roadmap overview' },
  '/roadmap': { title: 'Roadmap', subtitle: '2022–2027 platform timeline' },
  '/preview': { title: 'Customer preview', subtitle: 'Provisional page published to the Support Centre' },
  '/plan': { title: '2027 Planning', subtitle: 'Set objectives and get AI-powered recommendations' },
  '/apps': { title: 'Applications', subtitle: 'Practera platform application registry' },
  '/gaps': { title: 'Gap Analysis', subtitle: 'Objectives vs capability coverage' },
  '/initiatives': { title: 'Initiatives', subtitle: 'All roadmap initiatives' },
  '/admin': { title: 'Admin', subtitle: 'Manage roadmap data and integrations' },
  '/admin/sync': { title: 'Sync', subtitle: 'Jira and GitHub data sync status' },
};

export function Header() {
  const pathname = usePathname();

  const matchedKey = Object.keys(pageTitles)
    .filter((k) => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];

  const { title, subtitle } = pageTitles[matchedKey] ?? { title: 'Practera Roadmap' };

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-6 gap-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
    </header>
  );
}
