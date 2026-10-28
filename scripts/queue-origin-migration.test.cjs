/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { migrate } = require('drizzle-orm/expo-sqlite/migrator');

const { fixture } = require('./test-support/local-fixture.cjs');

// Exact DDL/timestamps from earlier unmerged APKs, retained only to test upgrades.
const prior = [
  {
    when: 1792854786931,
    sql: 'CREATE INDEX `forms_pin_id_idx` ON `forms` (`pinId`);--> statement-breakpoint\nCREATE INDEX `queue_entity_status_idx` ON `sync_queue` (`entityType`,`entityId`,`status`);--> statement-breakpoint\nCREATE INDEX `queue_pending_order_idx` ON `sync_queue` (`status`,`sequenceNumber`);',
  },
  {
    when: 1792856595691,
    sql: 'CREATE TABLE `sync_inflight` (\n\t`key` text PRIMARY KEY NOT NULL,\n\t`queueId` text NOT NULL,\n\t`entityType` text NOT NULL,\n\t`entityId` text NOT NULL,\n\t`operation` text NOT NULL,\n\t`status` text NOT NULL\n);\n',
  },
  {
    when: 1793070128606,
    sql: 'ALTER TABLE `sync_queue` ADD `writeOrigin` text;',
  },
];
const directory = path.join(__dirname, '../drizzle');
const journal = JSON.parse(fs.readFileSync(path.join(directory, 'meta/_journal.json'), 'utf8'));
const entries = journal.entries.map((entry) => ({
  ...entry,
  sql: fs.readFileSync(path.join(directory, `${entry.tag}.sql`), 'utf8'),
}));
function bundle(rows) {
  return {
    journal: { entries: rows.map((row, idx) => ({ ...row, idx })) },
    migrations: Object.fromEntries(
      rows.map((row, idx) => [`m${String(idx).padStart(4, '0')}`, row.sql])
    ),
  };
}
function records(f) {
  return Object.fromEntries(
    ['pins', 'forms', 'sync_queue', 'sync_inflight'].map((table) => {
      const exists = f.sqlite.prepare('SELECT name FROM sqlite_master WHERE name=?').get(table);
      return [table, exists ? f.sqlite.prepare(`SELECT * FROM ${table}`).all() : []];
    })
  );
}
for (const [label, depth] of [
  ['main', 0],
  ['indexes APK', 1],
  ['journal APK', 2],
  ['origin APK', 3],
]) {
  test(`consolidated migration preserves records and upload evidence from ${label}`, async (t) => {
    const f = fixture(':memory:', { reopen: true });
    t.after(f.close);
    await migrate(f.db, bundle([...entries.slice(0, 4), ...prior.slice(0, depth)]));
    f.sqlite.exec(`
      INSERT INTO pins (id,createdAt,name,lat,lng,status,images)
        VALUES ('qa-pin',1767225600,'QA saved pin',1,2,'unsynced','["photo.jpg"]');
      INSERT INTO forms (id,createdAt,pinId,villageId,name,village,age,canAttendHealthScreening,status)
        VALUES ('qa-form',1767225600,'qa-pin','','','QA village',0,0,NULL);
      INSERT INTO sync_queue (id,entityType,entityId,operation,idempotencyKey,payload,status,attempts,lastError)
        VALUES ('qa-queue','form','qa-form','update','qa-key','{"id":"qa-form","version":1}','failed',2,'Offline');
    `);
    if (depth >= 2)
      f.sqlite.exec(
        `INSERT INTO sync_inflight VALUES ('qa-key','qa-queue','form','qa-form','{"payload":"keep verbatim"}','failed')`
      );
    if (depth === 3) f.sqlite.exec("UPDATE sync_queue SET writeOrigin='atomic-v1'");
    const before = records(f);
    await migrate(f.db, bundle(entries));
    const after = records(f);
    assert.equal(after.sync_queue[0].writeOrigin, depth === 3 ? 'atomic-v1' : null);
    if (depth < 3) before.sync_queue[0].writeOrigin = null;
    assert.deepEqual(after, before);
    assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(
      f.sqlite
        .prepare('PRAGMA table_info(sync_queue)')
        .all()
        .find((c) => c.name === 'writeOrigin').notnull,
      0
    );
    for (const name of ['forms_pin_id_idx', 'queue_entity_status_idx', 'queue_pending_order_idx'])
      assert.ok(
        f.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name=?").get(name)
      );
    const history = f.sqlite.prepare('SELECT * FROM __drizzle_migrations').all();
    await migrate(f.db, bundle(entries));
    assert.deepEqual(f.sqlite.prepare('SELECT * FROM __drizzle_migrations').all(), history);
    assert.deepEqual(records(f), before);
    await migrate(
      f.db,
      bundle([
        ...entries,
        { when: entries[4].when + 1, sql: 'CREATE TABLE qa_next_upgrade (id TEXT);' },
      ])
    );
    assert.ok(
      f.sqlite.prepare("SELECT name FROM sqlite_master WHERE name='qa_next_upgrade'").get()
    );
  });
}
test('fresh install and failed consolidated migration retry use the actual Expo migrator', async (t) => {
  const fresh = fixture(':memory:', { reopen: true });
  t.after(fresh.close);
  await migrate(fresh.db, bundle(entries));
  assert.ok(
    fresh.sqlite.prepare("SELECT name FROM sqlite_master WHERE name='sync_inflight'").get()
  );
  const f = fixture(':memory:', { reopen: true });
  t.after(f.close);
  await migrate(f.db, bundle(entries.slice(0, 4)));
  const before = records(f);
  await assert.rejects(
    migrate(
      f.db,
      bundle([
        ...entries.slice(0, 4),
        {
          ...entries[4],
          sql:
            entries[4].sql + '\n--> statement-breakpoint\nINSERT INTO qa_missing_table VALUES (1);',
        },
      ])
    )
  );
  assert.deepEqual(records(f), before);
  assert.equal(
    f.sqlite
      .prepare('PRAGMA table_info(sync_queue)')
      .all()
      .some((c) => c.name === 'writeOrigin'),
    false
  );
  assert.equal(
    f.sqlite.prepare("SELECT name FROM sqlite_master WHERE name='sync_inflight'").get(),
    undefined
  );
  await migrate(f.db, bundle(entries));
  assert.ok(f.sqlite.prepare("SELECT name FROM sqlite_master WHERE name='sync_inflight'").get());
  assert.equal(entries.length, 5);
  assert.equal(entries[4].when, prior[2].when);
  const wiring = fs.readFileSync(path.join(directory, 'migrations.js'), 'utf8');
  assert.match(wiring, /import m0004 from '\.\/0004_local_reliability\.sql'/);
  assert.doesNotMatch(wiring, /import m000[56]/);
});
