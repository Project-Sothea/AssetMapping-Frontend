const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { fixture } = require('./test-support/local-fixture.cjs');

async function interruptedChildUpdate(f) {
  const created = await f.formService.createForm(f.values);
  await f.syncQueue.uploadPendingChanges();
  const form = await f.formService.getFormById(created.id);
  f.setForms([form]);
  f.setPins([await f.pinService.getPinById(f.pin.id)]);
  await f.formService.updateForm(form.id, { name: 'QA interrupted child revision' });
  f.setSyncResponse(async (request) =>
    request.entityType === 'form'
      ? { success: false, error: 'Network timeout' }
      : { success: true, data: { ...request.payload, version: request.payload.version + 1 } }
  );
  assert.equal((await f.syncQueue.uploadPendingChanges()).failed, 1);
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 1);
  return form;
}

for (const legacy of [true, false]) {
  test(`confirmed pin deletion retires failed child journals (${legacy ? 'legacy' : 'durable'})`, async (t) => {
    const f = fixture(':memory:', { legacy });
    t.after(f.close);
    await interruptedChildUpdate(f);
    await f.pinService.deletePin(f.pin.id);
    // The child retry still fails; the later acknowledged parent cascade supersedes it.
    f.setSyncResponse(async (request) =>
      request.entityType === 'form'
        ? { success: false, error: 'Network timeout' }
        : { success: true, data: { id: request.payload.id, deleted: true } }
    );
    assert.equal((await f.syncQueue.uploadPendingChanges()).remaining, 0);
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 0);
    f.setForms([]);
    f.setPins([]);
    assert.equal((await f.syncQueue.uploadPendingChanges()).remaining, 0);
  });
}

test('a lost parent deletion acknowledgement preserves child recovery until a later confirmation after restart', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'soform-child-journal-'));
  const filename = path.join(dir, 'qa.sqlite');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const first = fixture(filename, { legacy: true });
  const form = await interruptedChildUpdate(first);
  await first.pinService.deletePin(first.pin.id);
  first.setSyncResponse(async () => ({ success: false, error: 'Network timeout after commit' }));
  assert.equal((await first.syncQueue.uploadPendingChanges()).remaining, 2);
  assert.equal(first.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 2);
  first.close();

  const recovered = fixture(filename, { legacy: true, reopen: true });
  t.after(recovered.close);
  // Parent deletion committed on the server. Its GET 404 independently confirms
  // the cascade; the old child's update also returns 404 and cannot replay.
  recovered.setPins([]);
  recovered.setForms([]);
  assert.equal((await recovered.syncQueue.uploadPendingChanges()).remaining, 0);
  assert.equal(recovered.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 0);
  assert.equal(await recovered.formService.getFormById(form.id), null);
});

test('confirmed pin deletion also retires journals for children already deleted locally', async (t) => {
  const f = fixture(':memory:', { legacy: true });
  t.after(f.close);
  const form = await interruptedChildUpdate(f);
  await f.formService.deleteForm(form.id);
  await f.pinService.deletePin(f.pin.id);
  f.setSyncResponse(async (request) =>
    request.entityType === 'form'
      ? { success: false, error: 'Network timeout' }
      : { success: true, data: { id: request.payload.id, deleted: true } }
  );
  assert.equal((await f.syncQueue.uploadPendingChanges()).remaining, 0);
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 0);
  assert.ok(!f.operations().some((op) => op.entityType === 'form' && op.status !== 'completed'));
});

test('retiring a deleted pin child preserves unrelated and malformed journal records', async (t) => {
  const f = fixture();
  t.after(f.close);
  await f.pinService.createPin({
    id: 'qa-parent-delete',
    name: 'QA parent',
    lat: 1,
    lng: 2,
    images: [],
  });
  const op = f.operations().find((item) => item.entityId === 'qa-parent-delete');
  const samples = [
    {
      key: 'qa-unrelated',
      operation: JSON.stringify({
        entityType: 'form',
        payload: JSON.stringify({ pinId: 'qa-other' }),
      }),
    },
    { key: 'qa-malformed', operation: 'not JSON' },
    { key: 'qa-null', operation: 'null' },
    {
      key: 'qa-malformed-payload',
      operation: JSON.stringify({ entityType: 'form', payload: 'not JSON' }),
    },
  ];
  const stmt = f.sqlite.prepare(
    'INSERT INTO sync_inflight (key, queueId, entityType, entityId, operation, status) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const row of samples) stmt.run(row.key, row.key, 'form', row.key, row.operation, 'pending');
  f.queue.markCompleted({ ...op, operation: 'delete' }, { id: op.entityId, deleted: true });
  assert.deepEqual(
    f.sqlite
      .prepare('SELECT key FROM sync_inflight ORDER BY key')
      .all()
      .map((row) => row.key),
    samples.map((row) => row.key).sort()
  );
});

test('child retirement and parent acknowledgement roll back together on a local write failure', async (t) => {
  const f = fixture();
  t.after(f.close);
  const form = await f.formService.createForm(f.values);
  const child = f.operations().find((op) => op.entityType === 'form');
  f.queue.stageOperation(child);
  await f.pinService.deletePin(f.pin.id);
  const parent = f.operations().find((op) => op.entityType === 'pin' && op.operation === 'delete');
  f.queue.stageOperation(parent);
  f.sqlite.exec(
    "CREATE TRIGGER qa_retire_fail BEFORE DELETE ON sync_inflight WHEN OLD.entityType='form' BEGIN SELECT RAISE(ABORT,'QA child retirement failed'); END"
  );
  assert.throws(
    () => f.queue.markCompleted(parent, { id: parent.entityId, deleted: true }),
    /retirement failed/
  );
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 2);
  assert.equal(f.operations().find((op) => op.id === parent.id).status, 'pending');
  f.sqlite.exec('DROP TRIGGER qa_retire_fail');
  f.queue.markCompleted(parent, { id: parent.entityId, deleted: true });
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 0);
  assert.equal(f.operations().find((op) => op.id === parent.id).status, 'completed');
  assert.equal(await f.formService.getFormById(form.id), null);
});

for (const parentState of ['missing', 'completed']) {
  test(`replayed confirmed deletion retires children when the parent queue row is ${parentState}`, async (t) => {
    const f = fixture();
    t.after(f.close);
    await f.formService.createForm(f.values);
    const child = f.operations().find((op) => op.entityType === 'form');
    f.queue.stageOperation(child);
    await f.pinService.deletePin(f.pin.id);
    const parent = f
      .operations()
      .find((op) => op.entityType === 'pin' && op.operation === 'delete');
    if (parentState === 'missing')
      f.sqlite.prepare('DELETE FROM sync_queue WHERE id=?').run(parent.id);
    else f.sqlite.prepare("UPDATE sync_queue SET status='completed' WHERE id=?").run(parent.id);
    f.queue.markCompleted(parent, { id: parent.entityId, deleted: true });
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 0);
  });
}
