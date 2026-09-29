import { Pool, type PoolConfig } from 'pg';

function resolveSsl(): PoolConfig['ssl'] {
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

export const dbPool = new Pool({
  user: process.env.DB_USER || 'intersective',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'roadmap',
  password: process.env.DB_PASSWORD || 'lCG8QXnnmdblKBbzkpc97xlu',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: resolveSsl(),
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});
