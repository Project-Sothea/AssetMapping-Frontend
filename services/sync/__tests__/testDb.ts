import { readFileSync } from 'fs';
import { join } from 'path';

import { drizzle } from 'drizzle-orm/sql-js';
import type initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

import { forms, pins, syncQueue } from '~/db/schema';

export let db: ReturnType<typeof drizzle>;
let SQL: Awaited<ReturnType<typeof initSqlJs>>;
let sqlite: Database;

export async function initializeTestDb() {
  // The asm build avoids WebAssembly typed-array realm issues in Jest's VM.
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    SQL = await require('sql.js/dist/sql-asm.js')();
  } finally {
    warn.mockRestore();
  }
}

export function resetTestDb(snapshot?: Uint8Array) {
  sqlite = new SQL.Database(snapshot);
  // Use the checked-in migration journal, not a hand-written approximation.
  const journal = JSON.parse(
    readFileSync(join(__dirname, '../../../drizzle/meta/_journal.json'), 'utf8')
  );
  if (!snapshot) {
    for (const entry of journal.entries) {
      sqlite.run(readFileSync(join(__dirname, '../../../drizzle', `${entry.tag}.sql`), 'utf8'));
    }
  }
  sqlite.run('PRAGMA foreign_keys = ON');
  db = drizzle(sqlite, { schema: { forms, pins, syncQueue } });
}

export const exportTestDb = () => sqlite.export();
