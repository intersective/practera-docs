import Link from 'next/link';
import { Application } from '@/types/entities';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { layerColor } from '@/lib/utils';
import { GitBranch, ChevronRight } from 'lucide-react';

interface AppCardProps {
  application: Application;
  capabilityCount?: number;
}

export function AppCard({ application, capabilityCount = 0 }: AppCardProps) {
  return (
    <Link href={`/apps/${application.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{application.name}</h3>
                <StatusBadge status={application.status} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${layerColor(application.layer)}`}>
                  {application.layer}
                </span>
              </div>
              {application.description && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{application.description}</p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              <span>{capabilityCount} capabilities</span>
            </div>
            {application.techStack && application.techStack.length > 0 && (
              <div className="flex gap-1 flex-wrap justify-end">
                {application.techStack.slice(0, 3).map((tech) => (
                  <span key={tech} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                    {tech}
                  </span>
                ))}
                {application.techStack.length > 3 && (
                  <span className="text-gray-400">+{application.techStack.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
