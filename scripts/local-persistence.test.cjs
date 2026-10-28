const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const test = require('node:test');

const { fixture } = require('./test-support/local-fixture.cjs');

function setup(t) {
  const f = fixture();
  t.after(f.close);
  return f;
}

test('create persists response, parent activity and both outbox entries', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM forms').get().n, 1);
  assert.equal(f.operations().length, 2);
  assert.equal(f.operations().find((op) => op.entityType === 'form').entityId, form.id);
  const saved = await f.formService.getFormById(form.id);
  assert.equal(saved.age, null);
  assert.equal(saved.handwashingBeforeMeals, '');
  assert.deepEqual(saved.longTermConditions, ['QA option']);
});

test('outbox insert failure rolls back new response AND parent update', async (t) => {
  const f = setup(t);
  f.failQueue('INSERT');
  await assert.rejects(f.formService.createForm(f.values));
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM forms').get().n, 0);
  assert.equal(f.operations().length, 0);
  assert.equal(f.sqlite.prepare('SELECT status FROM pins').get().status, 'synced');
});

test('outbox update failure rolls back edited answers; retry has one form', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  f.failQueue('UPDATE');
  await assert.rejects(f.formService.updateForm(form.id, { name: 'QA edited' }));
  assert.equal((await f.formService.getFormById(form.id)).name, f.values.name);
  f.sqlite.exec('DROP TRIGGER qa_fail');
  await f.formService.updateForm(form.id, { name: 'QA edited' });
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM forms').get().n, 1);
  assert.equal(f.operations().filter((op) => op.entityType === 'form').length, 1);
});

test('outbox failure rolls back deletion, retaining response', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  for (const op of f.operations()) f.queue.markCompleted(op, { version: 1 });
  f.failQueue('INSERT');
  await assert.rejects(f.formService.deleteForm(form.id));
  assert.ok(await f.formService.getFormById(form.id));
});

test('old upload acknowledgement cannot complete a newer edit', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  const old = f.operations().find((op) => op.entityType === 'form');
  await f.formService.updateForm(form.id, { name: 'QA newer edit' });
  const revision = f.operations().find((op) => op.id === old.id).idempotencyKey;
  assert.notEqual(revision, old.idempotencyKey);
  f.queue.markCompleted(old, { version: 4 });
  const current = f.operations().find((op) => op.id === old.id);
  assert.equal(current.status, 'pending');
  assert.equal(JSON.parse(current.payload).version, 4);
  assert.equal(JSON.parse(current.payload).name, 'QA newer edit');
  assert.equal((await f.formService.getFormById(form.id)).status, 'unsynced');
  await f.queue.handleError(old, new Error('Conflict'));
  assert.equal(f.operations().find((op) => op.id === old.id).status, 'pending');
  f.queue.markCompleted(current, { version: 5 });
  assert.equal((await f.formService.getFormById(form.id)).status, 'synced');
});

test('repeated attempts use persisted idempotency key; server conflict preserves local answers', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  const op = f.operations().find((op) => op.entityType === 'form');
  f.setSyncResponse(async () => ({ success: false, error: 'Conflict: Server has newer data' }));
  await assert.rejects(f.queue.processOperation(op), /Conflict/);
  await assert.rejects(f.queue.processOperation(op), /Conflict/);
  assert.equal(f.calls[0].idempotencyKey, op.idempotencyKey);
  assert.equal(f.calls[1].idempotencyKey, op.idempotencyKey);
  assert.equal((await f.formService.getFormById(form.id)).name, f.values.name);
});

test('simultaneous manual uploads reject the second session without duplicate writes', async (t) => {
  const f = setup(t);
  await f.formService.createForm(f.values);
  const first = f.syncQueue.uploadPendingChanges();
  const second = f.syncQueue.uploadPendingChanges();
  const results = await Promise.allSettled([first, second]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.match(results[1].reason.message, /transfer.*progress/);
  assert.equal(f.calls.length, 2);
  assert.ok(f.operations().every((op) => op.status === 'completed'));
});

test('saving from an older open editor preserves the latest acknowledged version', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  const op = f.operations().find((row) => row.entityType === 'form');
  f.queue.markCompleted(op, { version: 6 });
  const saved = await f.formService.updateForm(form.id, {
    ...form,
    name: 'QA edited after upload',
  });
  assert.equal(saved.version, 6);
  assert.equal(
    JSON.parse(
      f.operations().find((row) => row.status === 'pending' && row.entityType === 'form').payload
    ).version,
    6
  );
});

test('pin and child-form deletion roll back together if the delete cannot be queued', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  f.sqlite.exec(
    "CREATE TRIGGER qa_pin_fail BEFORE UPDATE ON sync_queue WHEN NEW.entityType = 'pin' BEGIN SELECT RAISE(ABORT, 'QA injected pin queue failure'); END"
  );
  await assert.rejects(f.pinService.deletePin(f.pin.id));
  assert.ok(await f.formService.getFormById(form.id));
  assert.equal(f.operations().length, 2);
  f.sqlite.exec('DROP TRIGGER qa_pin_fail');
  await f.pinService.deletePin(f.pin.id);
  assert.equal(await f.formService.getFormById(form.id), null);
  assert.ok(f.operations().every((op) => op.entityType === 'pin' && op.operation === 'delete'));
});

test('committed form and outbox survive closing and reopening the database file', async (t) => {
  const os = require('node:os');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'soform-synthetic-persistence-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'qa.sqlite');
  const f = fixture(filename);
  const form = await f.formService.createForm(f.values);
  f.close();
  const reopened = new DatabaseSync(filename);
  try {
    const row = reopened.prepare('SELECT id, name, age FROM forms').get();
    assert.equal(row.id, form.id);
    assert.equal(row.name, f.values.name);
    assert.equal(row.age, null);
    const op = reopened.prepare("SELECT * FROM sync_queue WHERE entityType='form'").get();
    assert.equal(op.status, 'pending');
    assert.equal(op.entityId, form.id);
    assert.equal(JSON.parse(op.payload).name, row.name);
  } finally {
    reopened.close();
  }
});

test('editing an unsent create retains create semantics for a missing server row', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  await f.formService.updateForm(form.id, { name: 'QA latest offline edit' });
  assert.equal(f.operations().find((op) => op.entityType === 'form').operation, 'create');
});

test('a timeout wording from the actual HTTP client is retryable', async (t) => {
  const f = setup(t);
  await f.formService.createForm(f.values);
  const op = f.operations().find((row) => row.entityType === 'form');
  await f.queue.handleError(
    op,
    new Error('Request timed out. Please check your internet connection.')
  );
  assert.equal(f.operations().find((row) => row.id === op.id).status, 'pending');
});
