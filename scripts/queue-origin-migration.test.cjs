/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const test = require('node:test');

test('queue origin migration preserves existing records, pending work and recovery snapshots without backfilling trust', (t) => {
  const sqlite = new DatabaseSync(':memory:', { enableDoubleQuotedStringLiterals: true });
  t.after(() => sqlite.close());
  const directory = path.join(__dirname, '../drizzle');
  const journal = JSON.parse(fs.readFileSync(path.join(directory, 'meta/_journal.json'), 'utf8'));
  for (const entry of journal.entries.filter((entry) => entry.idx < 6))
    sqlite.exec(fs.readFileSync(path.join(directory, `${entry.tag}.sql`), 'utf8'));
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec(`
    INSERT INTO pins (id, createdAt, name, lat, lng, status, images)
      VALUES ('qa-pin', 1767225600, 'QA retained pin', 1, 2, 'unsynced', '["photo.jpg"]');
    INSERT INTO forms (id, createdAt, pinId, villageId, name, village, age, canAttendHealthScreening, status)
      VALUES ('qa-form', 1767225600, 'qa-pin', '', '', 'QA village', 0, 0, NULL);
    INSERT INTO sync_queue (id, entityType, entityId, operation, idempotencyKey, payload, status, attempts, lastError)
      VALUES ('qa-queue', 'form', 'qa-form', 'update', 'qa-key', '{"id":"qa-form","version":1}', 'failed', 2, 'QA interrupted upload');
    INSERT INTO sync_inflight (key, queueId, entityType, entityId, operation, status)
      VALUES ('qa-key', 'qa-queue', 'form', 'qa-form', '{"payload":"retained verbatim"}', 'failed');
  `);
  const tables = ['pins', 'forms', 'sync_queue', 'sync_inflight'];
  const before = Object.fromEntries(
    tables.map((table) => [table, sqlite.prepare(`SELECT * FROM ${table}`).all()])
  );
  const entry = journal.entries.find((entry) => entry.tag === '0006_queue_write_origin');
  assert.ok(entry, 'the migration is registered in the checked-in journal');
  sqlite.exec(fs.readFileSync(path.join(directory, `${entry.tag}.sql`), 'utf8'));
  for (const table of tables) {
    const after = sqlite.prepare(`SELECT * FROM ${table}`).all();
    if (table === 'sync_queue') {
      assert.equal(after[0].writeOrigin, null);
      delete after[0].writeOrigin;
    }
    assert.deepEqual(after, before[table], table);
  }
  assert.equal(sqlite.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  const column = sqlite
    .prepare('PRAGMA table_info(sync_queue)')
    .all()
    .find((row) => row.name === 'writeOrigin');
  assert.equal(column.notnull, 0);
  assert.equal(column.dflt_value, null);
  const bundle = fs.readFileSync(path.join(directory, 'migrations.js'), 'utf8');
  assert.equal(
    [...bundle.matchAll(/import m0006 from '\.\/0006_queue_write_origin\.sql'/g)].length,
    1
  );
  assert.equal([...bundle.matchAll(/\bm0006,/g)].length, 1);
});
