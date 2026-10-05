/**
 * Seed script: loads applications, historical roadmap data (2022-2025), 2026 initiatives,
 * and 2027 objectives from JSON files in src/data/.
 *
 * Run with: npm run seed:roadmap
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema/index';
import appsData from '../src/data/applications.json';
import historicalData from '../src/data/roadmap-2022-2025.json';
import initiatives2026 from '../src/data/initiatives-2026.json';
import objectives2027 from '../src/data/objectives-2027.json';

const pool = new Pool({
  user: process.env.DB_USER || 'intersective',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'roadmap',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

const db = drizzle(pool, { schema });

async function main() {
  console.log('🌱 Seeding Practera Roadmap database...');
  console.log(`   DB: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'roadmap'}`);

  await pool.query('CREATE SCHEMA IF NOT EXISTS roadmap');
  console.log('✓ roadmap schema ready');

  // --- Applications ---
  console.log(`\n📦 Seeding ${appsData.length} applications...`);
  for (const app of appsData as any[]) {
    await db
      .insert(schema.applications)
      .values(app)
      .onConflictDoUpdate({
        target: schema.applications.slug,
        set: { name: app.name, description: app.description, repoUrl: app.repoUrl, techStack: app.techStack, layer: app.layer, status: app.status, updatedAt: new Date() },
      });
    process.stdout.write('.');
  }
  console.log(`\n✓ ${appsData.length} applications`);

  // --- Historical initiatives (2022-2025) ---
  console.log(`\n📅 Seeding ${historicalData.length} historical initiatives (2022-2025)...`);
  for (const item of historicalData as any[]) {
    await db.insert(schema.initiatives).values({
      name: item.name,
      description: item.description || null,
      type: item.type || 'feature',
      status: item.status || 'complete',
      category: item.category || 'PLATFORM',
      year: item.year,
      startQuarter: item.startQuarter || null,
      endQuarter: item.endQuarter || null,
      effort: item.effort || null,
      impact: item.impact || null,
      assignees: item.assignees || null,
    }).onConflictDoNothing().catch(() => {});
    process.stdout.write('.');
  }
  console.log(`\n✓ ${historicalData.length} historical initiatives`);

  // --- 2026 initiatives ---
  console.log(`\n🚀 Seeding ${initiatives2026.length} 2026 initiatives...`);
  for (const initiative of initiatives2026 as any[]) {
    await db.insert(schema.initiatives).values(initiative).onConflictDoNothing().catch(() => {});
    process.stdout.write('.');
  }
  console.log(`\n✓ ${initiatives2026.length} 2026 initiatives`);

  // --- 2027 objectives ---
  console.log(`\n🎯 Seeding ${objectives2027.length} 2027 business objectives...`);
  for (const obj of objectives2027 as any[]) {
    await db.insert(schema.objectives).values(obj).onConflictDoNothing().catch(() => {});
    process.stdout.write('.');
  }
  console.log(`\n✓ ${objectives2027.length} 2027 objectives`);

  console.log('\n✅ Seed complete!\n');
  console.log('Next steps:');
  console.log('  npm run seed:capabilities  — Run AI analysis on CLAUDE.md files (or load from src/data/capabilities.json)');
  console.log('  npm run sync               — Sync Jira + GitHub data');
}

main()
  .catch((e) => { console.error('\n❌ Seed failed:', e); process.exit(1); })
  .finally(() => pool.end());
