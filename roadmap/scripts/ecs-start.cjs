#!/usr/bin/env node
/**
 * ECS/Fargate entry: apply schema if missing, seed JSON if empty, then start Next.
 * Uses database name from DB_NAME (default roadmap). Does not touch platform `core`.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Pool } = require('pg');

function resolveSsl() {
  const flag = (process.env.DB_SSL || '').toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'disable' || flag === 'off') {
    return undefined;
  }
  if (flag === 'true' || flag === '1' || flag === 'require' || flag === 'on') {
    return { rejectUnauthorized: false };
  }
  const host = process.env.DB_HOST || '';
  const localHosts = new Set(['', 'localhost', '127.0.0.1', 'practera-postgres']);
  if (!localHosts.has(host)) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

const pool = new Pool({
  user: process.env.DB_USER || 'intersective',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'roadmap',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: resolveSsl(),
  max: 2,
  connectionTimeoutMillis: 15000,
});

function readJson(name) {
  const p = path.join(__dirname, '..', 'src', 'data', name);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function seedIfEmpty() {
  const apps = readJson('applications.json');
  const historical = readJson('roadmap-2022-2025.json');
  const y2026 = readJson('initiatives-2026.json');
  const y2027 = readJson('objectives-2027.json');

  for (const app of apps) {
    await pool.query(
      `INSERT INTO roadmap.applications (slug, name, description, repo_url, tech_stack, layer, status)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         repo_url = EXCLUDED.repo_url,
         tech_stack = EXCLUDED.tech_stack,
         layer = EXCLUDED.layer,
         status = EXCLUDED.status,
         updated_at = now()`,
      [
        app.slug,
        app.name,
        app.description || null,
        app.repoUrl || null,
        JSON.stringify(app.techStack || []),
        app.layer || 'platform',
        app.status || 'active',
      ]
    );
  }

  const insertInitiative = async (item, defaults) => {
    await pool.query(
      `INSERT INTO roadmap.initiatives
        (name, description, type, status, category, year, start_quarter, end_quarter, effort, impact, assignees)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (name, year) DO NOTHING`,
      [
        item.name,
        item.description || null,
        item.type || defaults.type || 'feature',
        item.status || defaults.status || 'planned',
        item.category || defaults.category || 'PLATFORM',
        item.year,
        item.startQuarter || null,
        item.endQuarter || null,
        item.effort || null,
        item.impact ?? null,
        item.assignees || null,
      ]
    );
  };

  for (const item of historical) {
    await insertInitiative(item, { type: 'feature', status: 'complete', category: 'PLATFORM' });
  }
  for (const item of y2026) {
    await insertInitiative(item, { type: 'feature', status: 'planned', category: 'PLATFORM' });
  }
  for (const obj of y2027) {
    await pool.query(
      `INSERT INTO roadmap.objectives (name, description, year, priority, metrics)
       VALUES ($1,$2,$3,$4,$5::jsonb)
       ON CONFLICT (name, year) DO NOTHING`,
      [
        obj.name,
        obj.description || null,
        obj.year,
        obj.priority ?? 3,
        JSON.stringify(obj.metrics || []),
      ]
    );
  }
  console.log(
    `[roadmap] seed complete: apps=${apps.length} historical=${historical.length} 2026=${y2026.length} objectives=${y2027.length}`
  );
}

async function waitForDatabase() {
  const attempts = 30;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      console.error(`[roadmap] waiting for postgres (${i}/${attempts}):`, err.message || err);
      if (i === attempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function prepare() {
  await waitForDatabase();
  const sqlPath = path.join(__dirname, '..', 'drizzle', 'migrations', '0000_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM roadmap.applications');
  if ((rows[0] && rows[0].n) === 0) {
    console.log('[roadmap] database empty — loading bundled JSON');
    await seedIfEmpty();
  } else {
    console.log(`[roadmap] database already has ${rows[0].n} applications — skip seed`);
  }
}

prepare()
  .then(() => pool.end())
  .then(() => {
    const child = spawn('node', ['server.js'], { stdio: 'inherit', env: process.env });
    child.on('exit', (code) => process.exit(code == null ? 1 : code));
  })
  .catch((err) => {
    console.error('[roadmap] start failed:', err.message || err);
    process.exit(1);
  });
