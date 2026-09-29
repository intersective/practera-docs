export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatQuarter(year: number, quarter: string): string {
  return `${year} ${quarter}`;
}

export function quarterToDate(year: number, quarter: string): Date {
  const quarterMap: Record<string, number> = { Q1: 0, Q2: 3, Q3: 6, Q4: 9, H1: 0, H2: 6 };
  const month = quarterMap[quarter] ?? 0;
  return new Date(year, month, 1);
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    complete: 'bg-green-500',
    inDevelopment: 'bg-blue-500',
    planned: 'bg-yellow-400',
    maintenance: 'bg-gray-400',
    cancelled: 'bg-red-400',
  };
  return map[status] ?? 'bg-gray-300';
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    complete: 'Complete',
    inDevelopment: 'In Development',
    planned: 'Planned',
    maintenance: 'Maintenance',
    cancelled: 'Cancelled',
  };
  return map[status] ?? status;
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    critical: 'text-red-700 bg-red-100',
    high: 'text-orange-700 bg-orange-100',
    medium: 'text-yellow-700 bg-yellow-100',
    low: 'text-green-700 bg-green-100',
  };
  return map[severity] ?? 'text-gray-700 bg-gray-100';
}

export function maturityColor(maturity: string): string {
  const map: Record<string, string> = {
    stable: 'text-green-700 bg-green-100',
    prototype: 'text-purple-700 bg-purple-100',
    legacy: 'text-orange-700 bg-orange-100',
    planned: 'text-blue-700 bg-blue-100',
    deprecated: 'text-red-700 bg-red-100',
  };
  return map[maturity] ?? 'text-gray-700 bg-gray-100';
}

export function layerColor(layer: string): string {
  const map: Record<string, string> = {
    frontend: 'bg-purple-100 text-purple-800',
    backend: 'bg-blue-100 text-blue-800',
    api: 'bg-cyan-100 text-cyan-800',
    infra: 'bg-orange-100 text-orange-800',
    platform: 'bg-indigo-100 text-indigo-800',
    tooling: 'bg-gray-100 text-gray-800',
  };
  return map[layer] ?? 'bg-gray-100 text-gray-800';
}

export function categoryColor(category: string): string {
  const map: Record<string, string> = {
    PLATFORM: 'bg-blue-500',
    ADMIN: 'bg-purple-500',
    APP: 'bg-green-500',
    MAINTENANCE: 'bg-gray-500',
    INFRA: 'bg-orange-500',
  };
  return map[category] ?? 'bg-gray-400';
}
