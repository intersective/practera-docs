import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray';
}

const variants = {
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  purple: 'bg-purple-100 text-purple-800',
  orange: 'bg-orange-100 text-orange-800',
  gray: 'bg-gray-100 text-gray-600',
};

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    complete: { label: 'Complete', variant: 'green' },
    inDevelopment: { label: 'In Dev', variant: 'blue' },
    planned: { label: 'Planned', variant: 'yellow' },
    maintenance: { label: 'Maintenance', variant: 'gray' },
    cancelled: { label: 'Cancelled', variant: 'red' },
    active: { label: 'Active', variant: 'green' },
    deprecated: { label: 'Deprecated', variant: 'orange' },
  };
  const conf = map[status] ?? { label: status, variant: 'default' as const };
  return <Badge variant={conf.variant}>{conf.label}</Badge>;
}

export function MaturityBadge({ maturity }: { maturity: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    stable: { label: 'Stable', variant: 'green' },
    prototype: { label: 'Prototype', variant: 'purple' },
    legacy: { label: 'Legacy', variant: 'orange' },
    planned: { label: 'Planned', variant: 'blue' },
    deprecated: { label: 'Deprecated', variant: 'red' },
  };
  const conf = map[maturity] ?? { label: maturity, variant: 'default' as const };
  return <Badge variant={conf.variant}>{conf.label}</Badge>;
}
