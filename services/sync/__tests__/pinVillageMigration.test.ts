/** @jest-environment node */
import { readFileSync } from 'fs';
import { join } from 'path';

import initSqlJs from 'sql.js/dist/sql-asm.js';

const directory = join(__dirname, '../../../drizzle');

test('village migration preserves legacy values, survey answers, pending payloads and foreign keys', async () => {
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database();
  const journal = JSON.parse(readFileSync(join(directory, 'meta/_journal.json'), 'utf8'));
  const upgrade = journal.entries.find((entry: { tag: string }) =>
    entry.tag.includes('pin_owned_village')
  );
  expect(upgrade).toBeDefined();
  for (const entry of journal.entries.filter((entry: { idx: number }) => entry.idx < upgrade.idx)) {
    sqlite.run(readFileSync(join(directory, `${entry.tag}.sql`), 'utf8'));
  }
  sqlite.run('PRAGMA foreign_keys = ON');
  sqlite.run(
    `INSERT INTO pins (id, createdAt, lat, lng, name, cityVillage) VALUES ('p', 1, 12, 103, 'Old', 'Krang Svat')`
  );
  sqlite.run(
    `INSERT INTO forms (id, createdAt, pinId, villageId, name, village, otherVillage, conflictHealthcareAccess) VALUES ('f', 1, 'p', 'A1', 'Patient', 'others', 'Legacy village', 'Preserve answer')`
  );
  sqlite.run(
    `INSERT INTO sync_queue (id, entityId, entityType, operation, payload, idempotencyKey, status) VALUES ('q', 'f', 'form', 'update', '{"village":"others"}', 'key', 'pending')`
  );
  sqlite.run(readFileSync(join(directory, `${upgrade.tag}.sql`), 'utf8'));
  const columns = sqlite.exec('PRAGMA table_info(forms)')[0].values.map((row: unknown[]) => row[1]);
  expect(columns).not.toContain('village');
  expect(columns).not.toContain('otherVillage');
  expect(columns).toContain('villageId');
  expect(sqlite.exec('SELECT village, otherVillage FROM form_village_archive')[0].values).toEqual([
    ['others', 'Legacy village'],
  ]);
  expect(
    sqlite.exec('SELECT pinId, villageId, conflictHealthcareAccess FROM forms')[0].values
  ).toEqual([['p', 'A1', 'Preserve answer']]);
  expect(sqlite.exec('SELECT payload, status FROM sync_queue')[0].values).toEqual([
    ['{"village":"others"}', 'pending'],
  ]);
  expect(sqlite.exec('PRAGMA foreign_key_check')).toEqual([]);
  sqlite.run("DELETE FROM pins WHERE id = 'p'");
  expect(sqlite.exec('SELECT * FROM forms')).toEqual([]);
  sqlite.close();
});

test('bundled Expo migration rolls back on failure and retries idempotently on the same connection', async () => {
  const { migrate } = require('drizzle-orm/expo-sqlite/migrator');
  const { drizzle } = require('drizzle-orm/sql-js');
  const bundled = require('../../../drizzle/migrations').default;
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database();
  const database = drizzle(sqlite);
  await migrate(database, {
    ...bundled,
    journal: {
      ...bundled.journal,
      entries: bundled.journal.entries.filter((e: { idx: number }) => e.idx < 4),
    },
  });
  sqlite.run(
    "INSERT INTO pins (id, createdAt, lat, lng, name, cityVillage) VALUES ('p', 1, 12, 103, 'Pin', '')"
  );
  sqlite.run(
    "INSERT INTO forms (id, createdAt, pinId, villageId, name, village) VALUES ('f', 1, 'p', 'A1', '', 'Legacy')"
  );
  const failing = {
    ...bundled,
    migrations: {
      ...bundled.migrations,
      m0004:
        bundled.migrations.m0004 +
        ';--> statement-breakpoint INSERT INTO missing_table VALUES (1);',
    },
  };
  await expect(migrate(database, failing)).rejects.toThrow();
  expect(sqlite.exec('SELECT village FROM forms')[0].values).toEqual([['Legacy']]);
  expect(sqlite.exec("SELECT name FROM sqlite_master WHERE name='form_village_archive'")).toEqual(
    []
  );
  await migrate(database, bundled);
  await migrate(database, bundled);
  expect(sqlite.exec('SELECT count(*) FROM forms')[0].values).toEqual([[1]]);
  expect(sqlite.exec('SELECT village FROM form_village_archive')[0].values).toEqual([['Legacy']]);
  sqlite.close();
});
