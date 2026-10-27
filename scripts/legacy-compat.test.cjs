const assert = require('node:assert/strict');
const test = require('node:test');

const { fixture } = require('./test-support/local-fixture.cjs');

function setup(t, overrides = {}) {
  const f = fixture(':memory:', { overrides });
  f.setPins([f.utils.mapPinDbToPin(f.db.select().from(f.schema.pins).get())]);
  t.after(f.close);
  return f;
}
async function downloaded(f) {
  const created = await f.formService.createForm(f.values);
  for (const op of f.operations()) f.queue.markCompleted(op, { version: 1 });
  return f.formService.getFormById(created.id);
}

test('a legacy create remains blank in its actual upload and is acknowledged once', async (t) => {
  const f = setup(t);
  const created = await f.formService.createForm({
    ...f.values,
    name: '',
    villageId: '',
    householdNumber: '',
    age: null,
  });
  await f.syncQueue.uploadPendingChanges();
  const sent = f.calls.filter((call) => call.entityType === 'form');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].operation, 'create');
  for (const key of ['name', 'villageId', 'householdNumber'])
    assert.equal(sent[0].payload[key], '');
  assert.equal((await f.formService.getFormById(created.id)).status, 'synced');
});

for (const operation of ['update', 'delete']) {
  test(`pre-upload version check rejects a known stale ${operation} without sending it`, async (t) => {
    const f = setup(t);
    const form = await downloaded(f);
    f.setForms([{ ...form, name: 'QA other phone answer', version: 2 }]);
    if (operation === 'update') await f.formService.updateForm(form.id, { name: 'QA local draft' });
    else await f.formService.deleteForm(form.id);
    await f.syncQueue.uploadPendingChanges();
    assert.equal(f.calls.filter((call) => call.entityType === 'form').length, 0);
    assert.equal(
      f.operations().find((op) => op.entityType === 'form' && op.status !== 'completed').status,
      'failed'
    );
    if (operation === 'update')
      assert.equal((await f.formService.getFormById(form.id)).name, 'QA local draft');
  });
}

test('a missing server record blocks update instead of resurrecting a deleted form', async (t) => {
  const f = setup(t);
  const form = await downloaded(f);
  await f.formService.updateForm(form.id, { name: 'QA draft after remote delete' });
  await f.syncQueue.uploadPendingChanges();
  assert.equal(f.calls.filter((call) => call.entityType === 'form').length, 0);
  assert.equal((await f.formService.getFormById(form.id)).status, 'unsynced');
});

test('an existing UUID with different content blocks create instead of overwriting it', async (t) => {
  const f = setup(t);
  const created = await f.formService.createForm(f.values);
  const full = await f.formService.getFormById(created.id);
  f.setForms([{ ...full, name: 'QA different server content', version: 3 }]);
  await f.syncQueue.uploadPendingChanges();
  assert.equal(f.calls.length, 0);
  assert.equal((await f.formService.getFormById(created.id)).status, 'unsynced');
});

test('lost-reply recovery verifies current server content instead of replaying a committed write', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  const op = f.operations().find((op) => op.entityType === 'form');
  f.queue.stageOperation(op);
  const full = await f.formService.getFormById(form.id);
  f.setForms([{ ...full, version: 3 }]);
  await f.syncQueue.uploadPendingChanges();
  assert.equal(f.calls.length, 0);
  assert.equal((await f.formService.getFormById(form.id)).version, 3);
  assert.equal((await f.formService.getFormById(form.id)).status, 'synced');
});

test('legacy recovery of the older revision rebases the newer queued edit', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  const op = f.operations().find((op) => op.entityType === 'form');
  f.queue.stageOperation(op);
  const full = await f.formService.getFormById(form.id);
  f.setForms([{ ...full, version: 1 }]);
  await f.formService.updateForm(form.id, { name: 'QA newer local edit' });
  await f.syncQueue.uploadPendingChanges();
  const sent = f.calls.filter((call) => call.entityType === 'form');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].operation, 'update');
  assert.equal(sent[0].payload.name, 'QA newer local edit');
  assert.equal((await f.formService.getFormById(form.id)).version, 2);
});

test('legacy acknowledgement containing different answers cannot clear pending data', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  f.setSyncResponse(async (request) => ({
    success: true,
    data: { ...request.payload, name: 'QA incorrect cached answer', version: 1 },
  }));
  await f.syncQueue.uploadPendingChanges();
  assert.equal((await f.formService.getFormById(form.id)).name, f.values.name);
  assert.equal((await f.formService.getFormById(form.id)).status, 'unsynced');
});
