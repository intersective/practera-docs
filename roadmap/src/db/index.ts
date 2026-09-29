import { drizzle } from 'drizzle-orm/node-postgres';
import { dbPool } from './pool';
import * as schema from './schema';

export const db = drizzle(dbPool, { schema });

export { schema, dbPool };
