#!/usr/bin/env tsx
/**
 * Write the customer-safe What's coming page from the roadmap database.
 *
 * Usage (from roadmap/):
 *   npm run publish:customer
 *
 * The page is committed at ../docs/whats-coming.md and goes live when the
 * Support Centre is deployed from release/live. This script does not deploy.
 */

import fs from 'fs';
import path from 'path';
import { db, dbPool } from '../src/db';
import { initiatives } from '../src/db/schema';
import {
  partitionCustomerInitiatives,
  renderCustomerRoadmap,
} from '../src/lib/customer-roadmap';

async function main() {
  const outArg = process.argv.indexOf('--out');
  const filename =
    outArg !== -1
      ? process.argv[outArg + 1]
      : path.join(__dirname, '..', '..', 'docs', 'whats-coming.md');

  const rows = await db.select().from(initiatives);
  const { publishable, blocked } = partitionCustomerInitiatives(rows);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, renderCustomerRoadmap(rows));

  console.log(`Wrote ${publishable.length} customer item(s) to ${filename}`);
  if (blocked.length > 0) {
    console.log(`${blocked.length} visible item(s) were not published:`);
    for (const item of blocked) {
      console.log(`  - ${item.name}: ${item.reasons.join(' ')}`);
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error('Publish failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbPool.end();
  });
