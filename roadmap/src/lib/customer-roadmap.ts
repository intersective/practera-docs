/**
 * Customer-facing roadmap projection.
 * Only name, summary, coarse status, year, and quarter are rendered.
 * Internal fields (assignees, effort, Jira, GitHub, AI) are not accepted.
 */

export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  inDevelopment: 'In progress',
  complete: 'Shipped',
  maintenance: 'Ongoing',
};

const QUARTER_ORDER = ['Q1', 'Q2', 'Q3', 'Q4', 'Unscheduled'] as const;

export interface CustomerInitiativeFields {
  name: string;
  customerSummary?: string | null;
  customerVisible?: number | null;
  status: string;
  year: number;
  startQuarter?: string | null;
  endQuarter?: string | null;
}

export interface BlockedCustomerInitiative {
  name: string;
  year: number;
  status: string;
  reasons: string[];
}

export interface CustomerRoadmapPartition {
  publishable: CustomerInitiativeFields[];
  blocked: BlockedCustomerInitiative[];
}

export interface CustomerRoadmapGroup {
  year: number;
  quarter: string;
  heading: string;
  items: CustomerInitiativeFields[];
}

const PROVISIONAL_BANNER = [
  '# What\'s coming',
  '',
  '!!! warning "Provisional"',
  '',
  '    Dates and scope on this page are not a commitment. They can change.',
  '',
].join('\n');

export function customerQuarter(item: CustomerInitiativeFields): string {
  const start = item.startQuarter?.trim();
  if (start && (QUARTER_ORDER as readonly string[]).includes(start)) return start;
  const end = item.endQuarter?.trim();
  if (end && (QUARTER_ORDER as readonly string[]).includes(end)) return end;
  return 'Unscheduled';
}

export function customerStatusLabel(status: string): string {
  return CUSTOMER_STATUS_LABELS[status] ?? status;
}

function publishBlockers(item: CustomerInitiativeFields): string[] {
  const reasons: string[] = [];
  if (!(item.customerSummary?.trim())) {
    reasons.push('Add a customer summary before this can be published.');
  }
  if (item.status === 'cancelled') {
    reasons.push('Cancelled items are not published.');
  }
  return reasons;
}

export function partitionCustomerInitiatives(
  items: CustomerInitiativeFields[],
): CustomerRoadmapPartition {
  const publishable: CustomerInitiativeFields[] = [];
  const blocked: BlockedCustomerInitiative[] = [];

  for (const item of items) {
    if (item.customerVisible !== 1) continue;
    const reasons = publishBlockers(item);
    if (reasons.length > 0) {
      blocked.push({
        name: item.name,
        year: item.year,
        status: item.status,
        reasons,
      });
      continue;
    }
    publishable.push({
      ...item,
      name: item.name.trim(),
      customerSummary: item.customerSummary?.trim() ?? '',
    });
  }

  return { publishable, blocked };
}

function quarterRank(quarter: string): number {
  const index = (QUARTER_ORDER as readonly string[]).indexOf(quarter);
  return index === -1 ? QUARTER_ORDER.length : index;
}

export function groupPublishable(items: CustomerInitiativeFields[]): CustomerRoadmapGroup[] {
  const { publishable } = partitionCustomerInitiatives(items);
  const groups = new Map<string, CustomerInitiativeFields[]>();
  for (const item of publishable) {
    const quarter = customerQuarter(item);
    const key = `${item.year}|${quarter}`;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      const [yearA, quarterA] = a.split('|');
      const [yearB, quarterB] = b.split('|');
      const yearDiff = Number(yearA) - Number(yearB);
      if (yearDiff !== 0) return yearDiff;
      return quarterRank(quarterA) - quarterRank(quarterB);
    })
    .map(([key, groupItems]) => {
      const [year, quarter] = key.split('|');
      const heading = quarter === 'Unscheduled' ? `${year} · Timing not set` : `${year} · ${quarter}`;
      return {
        year: Number(year),
        quarter,
        heading,
        items: [...groupItems].sort((a, b) => a.name.localeCompare(b.name)),
      };
    });
}

export function renderCustomerRoadmap(items: CustomerInitiativeFields[]): string {
  const groups = groupPublishable(items);
  if (groups.length === 0) {
    return `${PROVISIONAL_BANNER}\nNothing is published for customers yet.\n`;
  }

  const lines = [PROVISIONAL_BANNER.trimEnd(), ''];
  for (const group of groups) {
    lines.push(`## ${group.heading}`, '');
    for (const item of group.items) {
      const name = item.name.replace(/\s+/g, ' ').trim();
      lines.push(
        `### ${name}`,
        '',
        item.customerSummary?.trim() ?? '',
        '',
        `**Status:** ${customerStatusLabel(item.status)}`,
        '',
      );
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}
