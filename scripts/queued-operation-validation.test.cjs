const assert = require('node:assert/strict');
const test = require('node:test');

const { fixture } = require('./test-support/local-fixture.cjs');

function validator(f) {
  return f.load('services/sync/queue/validateQueuedOperation.ts').validateQueuedOperation;
}
function formOperation(f) {
  return f.operations().find((op) => op.entityType === 'form' && op.status !== 'completed');
}

test('optional omitted answers normalize to local NULL/lists while blanks, false and zero round-trip unchanged', async (t) => {
  const f = fixture();
  t.after(f.close);
  const form = await f.formService.createForm({
    ...f.values,
    name: '',
    villageId: '',
    householdNumber: '',
    otherVillage: null,
    age: 0,
    canAttendHealthScreening: false,
  });
  const op = formOperation(f);
  assert.doesNotThrow(() => validator(f)(op));
  assert.equal(op.writeOrigin, 'atomic-v1');
  assert.equal((await f.syncQueue.uploadPendingChanges()).remaining, 0);
  const saved = await f.formService.getFormById(form.id);
  assert.equal(saved.age, 0);
  assert.equal(saved.canAttendHealthScreening, false);
  assert.equal(saved.otherVillage, null);
  assert.equal(saved.householdNumber, '');
});

test('JSON date milliseconds need not equal SQLite second precision metadata', async (t) => {
  const f = fixture();
  t.after(f.close);
  await f.formService.createForm(f.values);
  const op = formOperation(f);
  const payload = JSON.parse(op.payload);
  payload.createdAt = '2026-10-27T01:23:45.678Z';
  payload.updatedAt = '2026-10-27T01:23:45.987Z';
  op.payload = JSON.stringify(payload);
  f.sqlite.prepare('UPDATE sync_queue SET payload=? WHERE id=?').run(op.payload, op.id);
  assert.doesNotThrow(() => validator(f)(op));
});

for (const [label, value] of [
  ['null', null],
  ['blank', ''],
  ['false', false],
]) {
  test(`queued scalar ${label} cannot silently replace a different saved value`, async (t) => {
    const f = fixture();
    t.after(f.close);
    await f.formService.createForm({ ...f.values, householdNumber: 'QA saved ID' });
    const op = formOperation(f);
    op.payload = JSON.stringify({ ...JSON.parse(op.payload), householdNumber: value });
    f.sqlite.prepare('UPDATE sync_queue SET payload=? WHERE id=?').run(op.payload, op.id);
    assert.throws(() => f.queue.stageOperation(op), /needs review/);
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 0);
    assert.equal(f.calls.length, 0);
  });
}

for (const label of ['partial', 'bad date', 'fractional version', 'unknown field', 'null array']) {
  test(`new ${label} snapshot is rejected before staging or HTTP`, async (t) => {
    const f = fixture();
    t.after(f.close);
    await f.formService.createForm(f.values);
    const op = formOperation(f);
    const payload = label === 'partial' ? { id: op.entityId, version: 1 } : JSON.parse(op.payload);
    if (label === 'bad date') payload.createdAt = 'not a date';
    if (label === 'fractional version') payload.version = 1.5;
    if (label === 'unknown field') payload.unrecognizedAnswer = 'QA';
    if (label === 'null array') payload.longTermConditions = null;
    op.payload = JSON.stringify(payload);
    f.sqlite.prepare('UPDATE sync_queue SET payload=? WHERE id=?').run(op.payload, op.id);
    assert.throws(() => f.queue.stageOperation(op), /needs review/);
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 0);
    assert.equal(f.calls.length, 0);
  });
}

test('an existing exact journal can replay older answers after a newer edit and after local deletion', async (t) => {
  const f = fixture();
  t.after(f.close);
  const form = await f.formService.createForm(f.values);
  const old = formOperation(f);
  f.queue.stageOperation(old);
  await f.formService.updateForm(form.id, { name: 'QA newer local answer' });
  assert.equal(validator(f)(old).name, f.values.name);
  await f.formService.deleteForm(form.id);
  assert.equal(await f.formService.getFormById(form.id), null);
  assert.equal(validator(f)(old).name, f.values.name);
  assert.equal(formOperation(f).writeOrigin, 'atomic-v1');
});

test('a prior exact compact delete journal remains recoverable without a write-origin tag', async (t) => {
  const f = fixture();
  t.after(f.close);
  const form = await f.formService.createForm(f.values);
  for (const op of f.operations()) f.queue.markCompleted(op, { version: 1 });
  await f.formService.deleteForm(form.id);
  const op = formOperation(f);
  op.writeOrigin = null;
  op.payload = JSON.stringify({ id: form.id, version: 1, pinId: f.pin.id });
  f.sqlite
    .prepare('UPDATE sync_queue SET payload=?,writeOrigin=NULL WHERE id=?')
    .run(op.payload, op.id);
  assert.throws(() => f.queue.stageOperation(op), /needs review/);
  f.sqlite
    .prepare(
      'INSERT INTO sync_inflight (key,queueId,entityType,entityId,operation,status) VALUES (?,?,?,?,?,?)'
    )
    .run(op.idempotencyKey, op.id, op.entityType, op.entityId, JSON.stringify(op), 'pending');
  assert.deepEqual(validator(f)(op), { id: form.id, version: 1, pinId: f.pin.id });
});

test('an orphan unsynced record with no outbox entry is not automatically uploaded or enqueued', async (t) => {
  const f = fixture();
  t.after(f.close);
  const form = await f.formService.createForm(f.values);
  f.sqlite.exec('DELETE FROM sync_queue');
  assert.equal((await f.syncQueue.uploadPendingChanges()).remaining, 0);
  assert.equal(f.calls.length, 0);
  assert.equal(f.operations().length, 0);
  assert.equal((await f.formService.getFormById(form.id)).status, 'unsynced');
});

test('new atomic creates send complete optional answer meaning without changing blanks, zero or false', async (t) => {
  const f = fixture();
  t.after(f.close);
  await f.formService.createForm({
    ...f.values,
    name: '',
    age: 0,
    canAttendHealthScreening: false,
  });
  assert.equal((await f.syncQueue.uploadPendingChanges()).remaining, 0);
  const sent = f.calls.find((request) => request.entityType === 'form').payload;
  assert.equal(sent.pressingHealthNeed, null);
  assert.deepEqual(sent.waterSources, []);
  assert.equal(sent.name, '');
  assert.equal(sent.age, 0);
  assert.equal(sent.canAttendHealthScreening, false);
});

test('an unknown create cannot falsely complete against a server row with additional omitted answers', async (t) => {
  const f = fixture();
  t.after(f.close);
  f.setPins([await f.pinService.getPinById(f.pin.id)]);
  const form = await f.formService.createForm(f.values);
  f.sqlite.prepare("UPDATE sync_queue SET writeOrigin=NULL WHERE entityType='form'").run();
  f.setForms([
    { ...(await f.formService.getFormById(form.id)), pressingHealthNeed: 'QA server-only answer' },
  ]);
  const result = await f.syncQueue.uploadPendingChanges();
  assert.equal(result.failed, 1);
  assert.equal(f.calls.filter((request) => request.entityType === 'form').length, 0);
  assert.equal((await f.formService.getFormById(form.id)).status, 'unsynced');
});

for (const journaled of [false, true]) {
  test(`an unknown partial update is held without clearing omitted answers (${journaled ? 'prior journal' : 'unstaged'})`, async (t) => {
    const f = fixture();
    t.after(f.close);
    const form = await f.formService.createForm(f.values);
    for (const op of f.operations()) f.queue.markCompleted(op, { version: 1 });
    await f.formService.updateForm(form.id, { name: 'QA saved edit' });
    const op = formOperation(f);
    const payload = JSON.parse(op.payload);
    delete payload.pressingHealthNeed;
    op.payload = JSON.stringify(payload);
    op.writeOrigin = null;
    f.sqlite
      .prepare('UPDATE sync_queue SET payload=?,writeOrigin=NULL WHERE id=?')
      .run(op.payload, op.id);
    if (journaled)
      f.sqlite
        .prepare(
          'INSERT INTO sync_inflight (key,queueId,entityType,entityId,operation,status) VALUES (?,?,?,?,?,?)'
        )
        .run(op.idempotencyKey, op.id, op.entityType, op.entityId, JSON.stringify(op), 'pending');
    const result = await f.syncQueue.uploadPendingChanges();
    assert.equal(result.failed, 1);
    assert.equal(f.calls.filter((request) => request.entityType === 'form').length, 0);
    assert.equal((await f.formService.getFormById(form.id)).name, 'QA saved edit');
    if (journaled)
      assert.equal(
        f.sqlite.prepare('SELECT operation FROM sync_inflight WHERE key=?').get(op.idempotencyKey)
          .operation,
        JSON.stringify(op)
      );
  });
}

test('old create journal keeps its original wire body and receipt key while validating complete server answers', async (t) => {
  const f = fixture();
  t.after(f.close);
  await f.formService.createForm(f.values);
  const op = formOperation(f);
  op.writeOrigin = null;
  f.sqlite.prepare('UPDATE sync_queue SET writeOrigin=NULL WHERE id=?').run(op.id);
  const original = JSON.parse(op.payload);
  assert.equal(Object.hasOwn(original, 'pressingHealthNeed'), false);
  f.queue.stageOperation(op);
  const normalize = f.load('services/sync/queue/validateQueuedOperation.ts').normalizeQueuedPayload;
  f.setSyncResponse(async (request) => ({
    success: true,
    data: {
      ...normalize(
        { entityType: request.entityType, operation: request.operation },
        request.payload
      ),
      version: request.operation === 'create' ? 1 : Number(request.payload.version) + 1,
    },
  }));
  assert.equal((await f.syncQueue.uploadPendingChanges()).remaining, 0);
  const sent = f.calls.find((request) => request.entityType === 'form');
  assert.deepEqual(sent.payload, original);
  assert.equal(sent.idempotencyKey, op.idempotencyKey);
});

test('a complete unknown update journal replays its exact original wire body', async (t) => {
  const f = fixture();
  t.after(f.close);
  const form = await f.formService.createForm(f.values);
  for (const op of f.operations()) f.queue.markCompleted(op, { version: 1 });
  f.setForms([await f.formService.getFormById(form.id)]);
  await f.formService.updateForm(form.id, { name: 'QA complete prior update' });
  const op = formOperation(f);
  op.writeOrigin = null;
  f.sqlite.prepare('UPDATE sync_queue SET writeOrigin=NULL WHERE id=?').run(op.id);
  f.queue.stageOperation(op);
  assert.equal((await f.syncQueue.uploadPendingChanges()).remaining, 0);
  const sent = f.calls.find((request) => request.entityType === 'form');
  assert.deepEqual(sent.payload, JSON.parse(op.payload));
  assert.equal(sent.idempotencyKey, op.idempotencyKey);
});

for (const queueState of ['same revision', 'missing']) {
  test(`a journal cannot mark unqueued newer local answers synced when its queue is ${queueState}`, async (t) => {
    const f = fixture();
    t.after(f.close);
    const form = await f.formService.createForm(f.values);
    const op = formOperation(f);
    f.queue.stageOperation(op);
    f.sqlite
      .prepare('UPDATE forms SET name=? WHERE id=?')
      .run('QA newer answer without matching outbox', form.id);
    if (queueState === 'missing') f.sqlite.prepare('DELETE FROM sync_queue WHERE id=?').run(op.id);
    const result = await f.syncQueue.uploadPendingChanges();
    assert.equal(result.failed, 1);
    assert.equal(f.calls.filter((request) => request.entityType === 'form').length, 0);
    const saved = await f.formService.getFormById(form.id);
    assert.equal(saved.name, 'QA newer answer without matching outbox');
    assert.equal(saved.status, 'unsynced');
    assert.equal(
      f.sqlite.prepare('SELECT operation FROM sync_inflight WHERE key=?').get(op.idempotencyKey)
        .operation,
      JSON.stringify(op)
    );
  });
}

test('a journaled delete cannot remove a record that still exists locally', async (t) => {
  const f = fixture();
  t.after(f.close);
  const form = await f.formService.createForm(f.values);
  const saved = await f.formService.getFormById(form.id);
  for (const op of f.operations()) f.queue.markCompleted(op, { version: 1 });
  await f.formService.deleteForm(form.id);
  const deletion = formOperation(f);
  f.queue.stageOperation(deletion);
  f.db.insert(f.schema.forms).values(f.utils.sanitizeFormForDb(saved)).run();
  const result = await f.syncQueue.uploadPendingChanges();
  assert.equal(result.failed, 1);
  assert.equal(f.calls.filter((request) => request.entityType === 'form').length, 0);
  assert.ok(await f.formService.getFormById(form.id));
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 1);
});
