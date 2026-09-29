'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GitBranch,
  Map,
  Eye,
  Target,
  Grid3X3,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/roadmap', label: 'Roadmap', icon: Map },
  { href: '/preview', label: 'Customer preview', icon: Eye },
  { href: '/plan', label: '2027 Planning', icon: Target },
  { href: '/apps', label: 'Applications', icon: Grid3X3 },
  { href: '/initiatives', label: 'Initiatives', icon: GitBranch },
  { href: '/gaps', label: 'Gap Analysis', icon: AlertTriangle },
  { href: '/admin', label: 'Admin', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-full fixed left-0 top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <Map className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Practera</div>
            <div className="text-xs text-gray-400">Roadmap</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">2026 · Practera Internal</p>
      </div>
    </aside>
  );
}
