#!/usr/bin/env tsx
/**
 * Export all roadmap data to a JSON file.
 *
 * Usage:
 *   npm run export                          # writes to ./exports/practera-roadmap-YYYY-MM-DD.json
 *   npm run export -- --out ./my-backup.json
 */

import path from 'path';
import fs from 'fs';
import { db } from '../src/db';
import {
  applications,
  capabilities,
  objectives,
  initiatives,
  gaps,
  jiraSync,
  githubSync,
} from '../src/db/schema';

async function main() {
  const outArg = process.argv.indexOf('--out');
  const filename =
    outArg !== -1
      ? process.argv[outArg + 1]
      : path.join(
          __dirname,
          '..',
          'exports',
          `practera-roadmap-${new Date().toISOString().slice(0, 10)}.json`,
        );

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(filename), { recursive: true });

  console.log('Exporting roadmap data...');

  const [appsData, capsData, objsData, initsData, gapsData, jiraData, ghData] =
    await Promise.all([
      db.select().from(applications).orderBy(applications.id),
      db.select().from(capabilities).orderBy(capabilities.id),
      db.select().from(objectives).orderBy(objectives.id),
      db.select().from(initiatives).orderBy(initiatives.id),
      db.select().from(gaps).orderBy(gaps.id),
      db.select().from(jiraSync).orderBy(jiraSync.id),
      db.select().from(githubSync).orderBy(githubSync.id),
    ]);

  const payload = {
    version: '1',
    exportedAt: new Date().toISOString(),
    data: {
      applications: appsData,
      capabilities: capsData,
      objectives: objsData,
      initiatives: initsData,
      gaps: gapsData,
      jiraSync: jiraData,
      githubSync: ghData,
    },
  };

  fs.writeFileSync(filename, JSON.stringify(payload, null, 2));

  const counts = {
    applications: appsData.length,
    capabilities: capsData.length,
    objectives: objsData.length,
    initiatives: initsData.length,
    gaps: gapsData.length,
    jiraSync: jiraData.length,
    githubSync: ghData.length,
  };

  console.log('\n✓ Exported:');
  for (const [k, n] of Object.entries(counts)) {
    console.log(`  ${k.padEnd(16)} ${n} rows`);
  }
  console.log(`\n→ ${filename}`);

  process.exit(0);
}

main().catch((e) => {
  console.error('Export failed:', e);
  process.exit(1);
});
