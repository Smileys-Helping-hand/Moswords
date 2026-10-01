/**
 * Applies scripts/migrations.ts and prints a schema-drift report.
 *
 *   npx tsx scripts/migrate.ts            apply pending migrations + report
 *   npx tsx scripts/migrate.ts --report   report only, change nothing
 *
 * Runs during the Amplify build (see amplify.yml). It never fails the build:
 * each statement is idempotent and reported individually, and the drift report
 * lists every table/column the code expects that the database lacks.
 */
import { neon } from '@neondatabase/serverless';
import { is } from 'drizzle-orm';
import { PgTable, getTableConfig } from 'drizzle-orm/pg-core';
import * as schema from '../src/lib/schema';
import { migrations } from './migrations';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[migrate] DATABASE_URL not set — skipping migrations.');
    return;
  }
  const sql = await connect(url);
  const reportOnly = process.argv.includes('--report');

  if (!reportOnly) {
    await sql.query(`CREATE TABLE IF NOT EXISTS app_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now(),
      failed_statements integer NOT NULL DEFAULT 0
    )`);
    const done = new Set(
      ((await sql.query(`SELECT id FROM app_migrations WHERE failed_statements = 0`)) as { id: string }[]).map((r) => r.id),
    );

    for (const migration of migrations) {
      if (done.has(migration.id)) continue;
      let failed = 0;
      for (const statement of migration.statements) {
        try {
          await sql.query(statement);
        } catch (error) {
          failed++;
          const firstLine = statement.trim().split('\n')[0].slice(0, 90);
          console.warn(`[migrate] ${migration.id}: FAILED "${firstLine}" — ${(error as Error).message}`);
        }
      }
      await sql.query(
        `INSERT INTO app_migrations (id, failed_statements) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET applied_at = now(), failed_statements = EXCLUDED.failed_statements`,
        [migration.id, failed],
      );
      console.log(`[migrate] ${migration.id}: ${migration.statements.length - failed}/${migration.statements.length} ok`);
    }
  }

  if (!reportOnly) await bootstrapOwnerPassword(sql);

  // ── Drift report ─────────────────────────────────────────────────────────
  const rows = (await sql.query(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`,
  )) as { table_name: string; column_name: string }[];
  const actual = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!actual.has(r.table_name)) actual.set(r.table_name, new Set());
    actual.get(r.table_name)!.add(r.column_name);
  }

  const missingTables: string[] = [];
  const missingColumns: string[] = [];
  for (const value of Object.values(schema)) {
    if (!is(value, PgTable)) continue;
    const config = getTableConfig(value);
    const columns = actual.get(config.name);
    if (!columns) {
      missingTables.push(config.name);
      continue;
    }
    for (const column of config.columns) {
      if (!columns.has(column.name)) missingColumns.push(`${config.name}.${column.name}`);
    }
  }

  if (missingTables.length === 0 && missingColumns.length === 0) {
    console.log('[migrate] schema drift: none — database matches src/lib/schema.ts');
  } else {
    console.warn(`[migrate] schema drift: missing tables: ${missingTables.join(', ') || 'none'}`);
    console.warn(`[migrate] schema drift: missing columns: ${missingColumns.join(', ') || 'none'}`);
  }
}

/**
 * One-off owner password set: when the build has OWNER_BOOTSTRAP_PASSWORD, the
 * owner account (mraaziqp@gmail.com) gets that password, and its existing
 * sessions are signed out. Skipped when the password already matches, so it is
 * safe across rebuilds. Remove the variable from Amplify once it has run.
 */
async function bootstrapOwnerPassword(sql: { query: (text: string, params?: unknown[]) => Promise<any[]> }) {
  const password = process.env.OWNER_BOOTSTRAP_PASSWORD;
  if (!password) return;
  const bcrypt = (await import('bcryptjs')).default;
  const [owner] = await sql.query(
    `SELECT id, password FROM users WHERE lower(email) = 'mraaziqp@gmail.com' LIMIT 1`,
  );
  if (!owner) {
    console.warn('[owner] owner account not found — password not set');
    return;
  }
  if (owner.password && (await bcrypt.compare(password, owner.password))) {
    console.log('[owner] password already up to date');
    return;
  }
  await sql.query(
    `UPDATE users SET password = $1, password_changed_at = now() WHERE id = $2`,
    [await bcrypt.hash(password, 12), owner.id],
  );
  await sql.query(`DELETE FROM rate_limits WHERE key = $1 OR key LIKE 'login:acct:%mraaziqp%'`, [`login:fail:${owner.id}`]);
  console.log('[owner] password updated; older sessions signed out');
}

/** Neon over HTTP in production; node-postgres for a local database. Both return row arrays. */
async function connect(url: string): Promise<{ query: (text: string, params?: unknown[]) => Promise<any[]> }> {
  const host = new URL(url).hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: url, max: 1, options: '-c timezone=UTC' });
    process.on('beforeExit', () => void pool.end());
    return { query: async (text, params) => (await pool.query(text, params as unknown[])).rows };
  }
  const neonSql = neon(url);
  return { query: (text, params) => neonSql.query(text, params) as Promise<any[]> };
}

main().catch((error) => {
  // Never block a deploy on the migration step; the report above says what's wrong.
  console.error('[migrate] aborted:', (error as Error).message);
});
