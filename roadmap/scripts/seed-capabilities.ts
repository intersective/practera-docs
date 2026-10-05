/**
 * Seed capabilities.
 *
 * Behaviour:
 *   - Default: runs GPT-5.6 Terra on all CLAUDE.md files, then saves results to
 *     src/data/capabilities.json for future use.
 *   - --from-file: loads capabilities.json directly — skips AI, no API cost.
 *
 * Run with:
 *   npm run seed:capabilities               # AI analysis + save to file
 *   npm run seed:capabilities -- --from-file # load from src/data/capabilities.json
 */
import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema/index';
import { analyzeAllApplicationCapabilities } from '../src/services/ai.service';
import { readAllClaudeMds, listAvailableRepos } from '../src/services/capability.service';

const CAPABILITIES_FILE = path.join(__dirname, '../src/data/capabilities.json');

const pool = new Pool({
  user: process.env.DB_USER || 'intersective',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'roadmap',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

const db = drizzle(pool, { schema });

type CapabilityItem = {
  name: string;
  category: string;
  description: string;
  maturity: string;
  gaps?: string | null;
  integrations?: string | null;
};

type AppCapabilities = {
  applicationSlug: string;
  capabilities: CapabilityItem[];
};

async function storeCapabilities(results: AppCapabilities[]) {
  let total = 0;
  for (const result of results) {
    const [app] = await db
      .select()
      .from(schema.applications)
      .where(eq(schema.applications.slug, result.applicationSlug));

    if (!app) {
      console.log(`  ⚠ Application not found in DB: ${result.applicationSlug} — run seed:roadmap first`);
      continue;
    }

    await db.delete(schema.capabilities).where(eq(schema.capabilities.applicationId, app.id));

    if (result.capabilities.length > 0) {
      await db.insert(schema.capabilities).values(
        result.capabilities.map((cap) => ({
          applicationId: app.id,
          name: cap.name,
          category: cap.category,
          description: cap.description,
          maturity: cap.maturity,
          gaps: cap.gaps ?? null,
          integrations: cap.integrations ?? null,
        })),
      );
    }

    console.log(`  ✓ ${result.applicationSlug}: ${result.capabilities.length} capabilities`);
    total += result.capabilities.length;
  }
  return total;
}

async function main() {
  const fromFile = process.argv.includes('--from-file');

  if (fromFile) {
    // ── Load from file ──────────────────────────────────────────────────────
    if (!fs.existsSync(CAPABILITIES_FILE)) {
      console.error(`❌ capabilities.json not found at ${CAPABILITIES_FILE}`);
      console.error('   Run without --from-file to generate it via AI analysis.');
      process.exit(1);
    }

    console.log('📂 Loading capabilities from src/data/capabilities.json...');
    const results: AppCapabilities[] = JSON.parse(fs.readFileSync(CAPABILITIES_FILE, 'utf-8'));
    console.log(`   Found capabilities for ${results.length} applications\n`);

    const total = await storeCapabilities(results);
    console.log(`\n✅ Done — ${total} capabilities stored across ${results.length} applications`);

  } else {
    // ── AI analysis ──────────────────────────────────────────────────────────
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not set');
      process.exit(1);
    }

    console.log('🤖 AI Capability Analysis — GPT-5.6 Terra\n');

    const available = listAvailableRepos();
    console.log('Repository CLAUDE.md availability:');
    for (const r of available) {
      console.log(`  ${r.available ? '✓' : '✗'} ${r.slug}`);
    }

    const claudeMds = readAllClaudeMds();
    console.log(`\n📖 Reading ${claudeMds.length} CLAUDE.md files...`);

    if (claudeMds.length === 0) {
      console.error('❌ No CLAUDE.md files found. Check WORKSPACE_ROOT environment variable.');
      console.error(`   Current WORKSPACE_ROOT: ${process.env.WORKSPACE_ROOT || '(not set, using ../)'}`);
      process.exit(1);
    }

    const tokenEst = claudeMds.reduce((s, r) => s + r.claudeMdContent.length / 4, 0);
    console.log(`   Estimated tokens: ~${Math.round(tokenEst / 1000)}k`);

    console.log('\n🧠 Running AI analysis (single batch request)...');
    const results = await analyzeAllApplicationCapabilities(claudeMds);
    console.log(`✓ AI returned capabilities for ${results.length} applications\n`);

    // Save to file so future runs can skip AI
    fs.writeFileSync(CAPABILITIES_FILE, JSON.stringify(results, null, 2));
    console.log(`💾 Saved to src/data/capabilities.json`);
    console.log(`   (Use --from-file on future runs to skip AI)\n`);

    const total = await storeCapabilities(results as AppCapabilities[]);
    console.log(`\n✅ Done — ${total} capabilities stored across ${results.length} applications`);
  }
}

main()
  .catch((e) => { console.error('\n❌ Failed:', e); process.exit(1); })
  .finally(() => pool.end());
