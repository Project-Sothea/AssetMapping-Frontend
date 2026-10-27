/* global __dirname */
const assert = require('node:assert/strict');
const test = require('node:test');

const { FORM_ARRAY_FIELDS } = require('@assetmapping/shared-types');
const { getTableColumns } = require('drizzle-orm');

const { fixture } = require('./test-support/local-fixture.cjs');

function setup(t, options = {}) {
  const f = fixture(':memory:', options);
  t.after(f.close);
  return f;
}
function fullForm(f, form) {
  return { ...Object.fromEntries(FORM_ARRAY_FIELDS.map((key) => [key, []])), ...form };
}
function useSnapshot(f, initial) {
  let data = initial;
  const api = f.load('services/api/client.ts');
  // The source module imports this exact object through the isolated module loader.
  api.request = async () => (typeof data === 'function' ? data() : { success: true, data });
  return (value) => {
    data = value;
  };
}

test('every scalar and array answer round-trips through local SQLite including null, blank, false, zero and Unicode', async (t) => {
  const f = setup(t);
  const values = { ...f.values };
  const columns = getTableColumns(f.schema.forms);
  for (const [key, column] of Object.entries(columns)) {
    if (['id', 'pinId', 'createdAt', 'updatedAt', 'status', 'version'].includes(key)) continue;
    values[key] = FORM_ARRAY_FIELDS.includes(key)
      ? ['', 'NA', 'សាកល្បង', 'comma,quote"\nline']
      : column.dataType === 'boolean'
        ? false
        : column.dataType === 'number'
          ? 0
          : `QA_${key}_សាកល្បង\n"`;
  }
  values.otherVillage = null;
  values.handwashingBeforeMealsReason = '';
  const form = await f.formService.createForm(values);
  const saved = await f.formService.getFormById(form.id);
  for (const key of Object.keys(values)) assert.deepEqual(saved[key], values[key], key);
  const payload = JSON.parse(f.operations().find((op) => op.entityType === 'form').payload);
  for (const key of Object.keys(values))
    assert.deepEqual(payload[key], values[key], `outbox ${key}`);
});

test('clean initialization preserves existing downloaded rows', async (t) => {
  const f = setup(t);
  await f.load('services/sync/localDataReset.ts').resetLocalDataOnce();
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM pins').get().n, 1);
  assert.equal(f.storage.get('localDataResetVersion'), '1');
});

test('snapshot catches deletions missed while offline', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  for (const op of f.operations()) f.queue.markCompleted(op, { version: 2 });
  useSnapshot(f, { protocolVersion: 1, pins: [], forms: [] });
  await f.pulls.pullSnapshot();
  assert.equal(await f.formService.getFormById(form.id), null);
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM pins').get().n, 0);
});

test('snapshot absence never deletes pending/failed answers or their parent pin', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  f.sqlite.exec("UPDATE sync_queue SET status='failed'");
  useSnapshot(f, { protocolVersion: 1, pins: [], forms: [] });
  await f.pulls.pullSnapshot();
  assert.equal((await f.formService.getFormById(form.id)).name, f.values.name);
  assert.equal(f.operations().length, 2);
});

test('snapshot started before a create acknowledgement cannot prune that newly synced response', async (t) => {
  const f = setup(t);
  let release;
  useSnapshot(
    f,
    () =>
      new Promise((resolve) => {
        release = resolve;
      })
  );
  const pulling = f.pulls.pullSnapshot();
  const form = await f.formService.createForm(f.values);
  for (const op of f.operations()) f.queue.markCompleted(op, { version: 1 });
  release({ success: true, data: { protocolVersion: 1, pins: [f.pin], forms: [] } });
  await pulling;
  assert.ok(await f.formService.getFormById(form.id));
});

test('snapshot started before an edit acknowledgement cannot prune the changed response', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  for (const op of f.operations()) f.queue.markCompleted(op, { version: 1 });
  let release;
  useSnapshot(
    f,
    () =>
      new Promise((resolve) => {
        release = resolve;
      })
  );
  const pulling = f.pulls.pullSnapshot();
  await f.formService.updateForm(form.id, { name: 'QA newer answer' });
  for (const op of f.operations().filter((op) => op.status === 'pending'))
    f.queue.markCompleted(op, { version: 2 });
  release({ success: true, data: { protocolVersion: 1, pins: [f.pin], forms: [] } });
  await pulling;
  assert.equal((await f.formService.getFormById(form.id)).name, 'QA newer answer');
});

for (const badCase of [
  'duplicate ID',
  'orphan',
  'invalid age',
  'invalid selection',
  'unsupported protocol',
]) {
  test(`rejects ${badCase} snapshot before making any row changes`, async (t) => {
    const f = setup(t);
    const saved = await f.formService.createForm(f.values);
    const form = fullForm(f, { ...saved, name: 'QA server replacement' });
    const snapshot = { protocolVersion: 1, pins: [f.pin], forms: [form] };
    if (badCase === 'duplicate ID') snapshot.pins.push(f.pin);
    if (badCase === 'orphan') form.pinId = 'missing';
    if (badCase === 'invalid age') form.age = 1.5;
    if (badCase === 'invalid selection') form.longTermConditions = 'not an array';
    if (badCase === 'unsupported protocol') snapshot.protocolVersion = 99;
    useSnapshot(f, snapshot);
    const before = f.sqlite.prepare('SELECT total_changes() n').get().n;
    await assert.rejects(f.pulls.pullSnapshot());
    assert.equal(f.sqlite.prepare('SELECT total_changes() n').get().n, before);
  });
}

test('failed snapshot request cannot prune local rows or mark pending work synced', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  useSnapshot(f, () => ({ success: false, error: 'HTTP 500' }));
  await assert.rejects(f.pulls.pullSnapshot(), /500/);
  assert.equal((await f.formService.getFormById(form.id)).status, 'unsynced');
  assert.equal(f.operations().filter((op) => op.status === 'pending').length, 2);
});

test('manual upload of an empty queue makes no HTTP writes', async (t) => {
  const f = setup(t);
  const result = await f.syncQueue.uploadPendingChanges();
  assert.equal(result.uploaded, 0);
  assert.equal(result.remaining, 0);
  assert.equal(f.calls.length, 0);
});

test('a refresh requested during a snapshot runs a fresh follow-up pass', async (t) => {
  const f = setup(t, { storage: [['localDataResetVersion', '1']] });
  let release;
  let calls = 0;
  useSnapshot(f, () => {
    calls++;
    return calls === 1
      ? new Promise((resolve) => {
          release = resolve;
        })
      : { success: true, data: { protocolVersion: 1, pins: [f.pin], forms: [] } };
  });
  const service = f.load('scripts/test-support/sync-tools.ts');
  const first = service.performFullSync();
  while (!release) await Promise.resolve();
  const second = service.performIncrementalSync();
  release({ success: true, data: { protocolVersion: 1, pins: [f.pin], forms: [] } });
  await Promise.all([first, second]);
  assert.equal(calls, 2);
});

for (const seed of [1, 7, 42, 8675309]) {
  test(`model sequence ${seed}: 120 edits, retries, failed writes and deletes preserve the latest committed answers`, async (t) => {
    const f = setup(t);
    let state = seed;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 2 ** 32;
    };
    const expected = new Map();
    for (let i = 0; i < 120; i++) {
      const ids = [...expected.keys()];
      const id = ids[Math.floor(random() * ids.length)];
      const choice = random();
      if (!id || choice < 0.25) {
        const form = await f.formService.createForm({
          ...f.values,
          name: `QA ${seed}-${i}`,
          age: i % 2 ? null : i,
        });
        expected.set(form.id, { name: form.name, age: form.age });
      } else if (choice < 0.7) {
        const next = { name: `QA edit ${seed}-${i}`, age: i % 3 ? null : i };
        await f.formService.updateForm(id, next);
        expected.set(id, next);
      } else if (choice < 0.85) {
        f.failQueue(
          f
            .operations()
            .some(
              (op) => op.entityType === 'form' && op.entityId === id && op.status !== 'completed'
            )
            ? 'UPDATE'
            : 'INSERT'
        );
        await assert.rejects(f.formService.updateForm(id, { name: 'QA failed write' }));
        f.sqlite.exec('DROP TRIGGER qa_fail');
      } else {
        await f.formService.deleteForm(id);
        expected.delete(id);
      }
      const rows = f.sqlite.prepare('SELECT id,name,age FROM forms').all();
      assert.equal(rows.length, expected.size);
      for (const row of rows) {
        assert.deepEqual({ name: row.name, age: row.age }, expected.get(row.id));
        assert.equal(
          f
            .operations()
            .filter(
              (op) =>
                op.entityType === 'form' && op.entityId === row.id && op.status !== 'completed'
            ).length,
          1
        );
      }
    }
  });
}

test('a stale open editor cannot overwrite answers downloaded since editing began', async (t) => {
  const f = setup(t);
  const created = await f.formService.createForm(f.values);
  for (const op of f.operations()) f.queue.markCompleted(op, { version: 1 });
  const baseline = await f.formService.getFormById(created.id);
  f.setForms([fullForm(f, { ...baseline, name: 'QA newer server answer', version: 2 })]);
  await f.pulls.pullAllForms();
  await assert.rejects(
    f.formService.updateForm(created.id, { ...baseline, name: 'QA stale draft' }, baseline),
    /changed while.*editing/i
  );
  assert.equal((await f.formService.getFormById(created.id)).name, 'QA newer server answer');
});

test('an acknowledgement with unchanged answers does not invalidate the open editor', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  const baseline = await f.formService.getFormById(form.id);
  for (const op of f.operations()) f.queue.markCompleted(op, { version: 3 });
  const saved = await f.formService.updateForm(form.id, { name: 'QA further edit' }, baseline);
  assert.equal(saved.version, 3);
  assert.equal(saved.name, 'QA further edit');
});

for (const [field, value] of [
  ['age', 1.2],
  ['age', -1],
  ['age', '22'],
  ['canAttendHealthScreening', 'false'],
  ['longTermConditions', '[]'],
]) {
  test(`local service rejects invalid ${field} (${JSON.stringify(value)}) before writing`, async (t) => {
    const f = setup(t);
    await assert.rejects(f.formService.createForm({ ...f.values, [field]: value }));
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM forms').get().n, 0);
    assert.equal(f.operations().length, 0);
  });
}

for (const malformed of [undefined, { id: 'wrong-id', version: 1 }, { version: 1 }]) {
  test(`an incomplete or mismatched server acknowledgement cannot mark a response synced (${JSON.stringify(malformed)})`, async (t) => {
    const f = setup(t);
    const form = await f.formService.createForm(f.values);
    f.setSyncResponse(async () => ({ success: true, data: malformed }));
    await f.syncQueue.processQueue();
    assert.equal((await f.formService.getFormById(form.id)).status, 'unsynced');
    assert.ok(f.operations().every((op) => op.status !== 'completed'));
  });
}

test('an acknowledgement containing different answers preserves the original local response', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  f.setSyncResponse(async (request) => ({
    success: true,
    data: { ...request.payload, version: 2, name: 'QA wrong server answer' },
  }));
  await f.syncQueue.processQueue();
  assert.equal((await f.formService.getFormById(form.id)).name, f.values.name);
  assert.equal((await f.formService.getFormById(form.id)).status, 'unsynced');
});

test('corrupt outbox identity fails before sending any request', async (t) => {
  const f = setup(t);
  await f.formService.createForm(f.values);
  const op = f.operations().find((op) => op.entityType === 'form');
  await assert.rejects(
    f.queue.processOperation({ ...op, payload: JSON.stringify({ id: 'different' }) }),
    /identity/i
  );
  assert.equal(f.calls.length, 0);
});

test('deleting from an older open editor cannot delete changed answers', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  const baseline = await f.formService.getFormById(form.id);
  await f.formService.updateForm(form.id, { name: 'QA latest local edit' });
  await assert.rejects(f.formService.deleteForm(form.id, baseline), /changed/i);
  assert.equal((await f.formService.getFormById(form.id)).name, 'QA latest local edit');
});

test('an in-flight create replay rebases the newer queued edit before sending it', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  const old = f.operations().find((op) => op.entityType === 'form');
  f.queue.stageOperation(old);
  await f.formService.updateForm(form.id, { name: 'QA latest after uncertain create' });
  await f.syncQueue.processQueue();
  assert.equal((await f.formService.getFormById(form.id)).name, 'QA latest after uncertain create');
  assert.equal((await f.formService.getFormById(form.id)).status, 'synced');
  const calls = f.calls.filter((request) => request.entityType === 'form');
  assert.deepEqual(
    calls.map((request) => request.operation),
    ['create', 'update']
  );
  assert.equal(calls[1].payload.version, 1);
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 0);
});

test('an explicit upload retries an uncertain revision before its newer local answer', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  const old = f.operations().find((op) => op.entityType === 'form');
  f.queue.stageOperation(old);
  await f.formService.updateForm(form.id, { name: 'QA newer pending answer' });
  await f.queue.handleError({ ...old, attempts: 2 }, new Error('Network error'));
  assert.equal(f.calls.length, 0);
  assert.equal((await f.syncQueue.getQueueMetrics()).failed, 1);
  await f.syncQueue.uploadPendingChanges();
  assert.equal((await f.formService.getFormById(form.id)).status, 'synced');
  assert.equal((await f.formService.getFormById(form.id)).name, 'QA newer pending answer');
  const sent = f.calls.filter((request) => request.entityType === 'form');
  assert.deepEqual(
    sent.map((request) => request.operation),
    ['create', 'update']
  );
});

test('historical populated SQLite storage is blocked before destructive migrations', async (t) => {
  const f = setup(t);
  const { DatabaseSync } = require('node:sqlite');
  const legacy = new DatabaseSync(':memory:');
  t.after(() => legacy.close());
  const fs = require('node:fs');
  const path = require('node:path');
  legacy.exec(fs.readFileSync(path.join(__dirname, '../drizzle/0000_tan_sersi.sql'), 'utf8'));
  legacy.exec(
    "INSERT INTO pins (id,name,lat,lng,createdAt) VALUES ('qa-legacy','QA saved household',1,2,'2025-01-01')"
  );
  const adapter = {
    getAllSync: (sql) => legacy.prepare(sql).all(),
    getFirstSync: (sql) => legacy.prepare(sql).get(),
  };
  const error = f.load('services/localUpgradeGuard.ts').getLocalUpgradeError(adapter);
  assert.match(error.message, /preserved/);
  assert.equal(legacy.prepare('SELECT name FROM pins').get().name, 'QA saved household');
});

test('the populated current schema passes the upgrade guard and retains pending responses', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  const adapter = {
    getAllSync: (sql) => f.sqlite.prepare(sql).all(),
    getFirstSync: (sql) => f.sqlite.prepare(sql).get(),
  };
  assert.equal(f.load('services/localUpgradeGuard.ts').getLocalUpgradeError(adapter), undefined);
  assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.equal(f.sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
  assert.ok(await f.formService.getFormById(form.id));
});

for (const scenario of [
  {
    name: 'populated older forms block even without a pins table',
    sql: "CREATE TABLE forms (id TEXT PRIMARY KEY, name TEXT); INSERT INTO forms VALUES ('saved', 'QA retained answer');",
    blocked: true,
  },
  {
    name: 'empty older schemas are allowed through the schema guard',
    sql: 'CREATE TABLE forms (id TEXT PRIMARY KEY); CREATE TABLE pins (id TEXT PRIMARY KEY, createdAt TEXT);',
    blocked: false,
  },
  {
    name: 'compatible populated pins with empty older forms are allowed through the schema guard',
    sql: "CREATE TABLE forms (id TEXT PRIMARY KEY); CREATE TABLE pins (id TEXT PRIMARY KEY, createdAt INTEGER); INSERT INTO pins VALUES ('saved', 1767225600000);",
    blocked: false,
  },
  {
    name: 'an empty new database is allowed through the schema guard',
    sql: '',
    blocked: false,
  },
]) {
  test(scenario.name, (t) => {
    const f = setup(t);
    const { DatabaseSync } = require('node:sqlite');
    const candidate = new DatabaseSync(':memory:');
    t.after(() => candidate.close());
    candidate.exec(scenario.sql);
    const before = candidate.prepare('SELECT * FROM sqlite_master ORDER BY name').all();
    const adapter = {
      getAllSync: (sql) => candidate.prepare(sql).all(),
      getFirstSync: (sql) => candidate.prepare(sql).get(),
    };
    const error = f.load('services/localUpgradeGuard.ts').getLocalUpgradeError(adapter);
    assert.equal(Boolean(error), scenario.blocked);
    assert.deepEqual(candidate.prepare('SELECT * FROM sqlite_master ORDER BY name').all(), before);
    if (scenario.blocked)
      assert.equal(candidate.prepare('SELECT name FROM forms').get().name, 'QA retained answer');
  });
}

test('React Native selection-field metadata matches the backend contract exactly', (t) => {
  const f = setup(t);
  assert.deepEqual([...f.load('db/formArrayFields.ts').FORM_ARRAY_FIELDS], [...FORM_ARRAY_FIELDS]);
});
