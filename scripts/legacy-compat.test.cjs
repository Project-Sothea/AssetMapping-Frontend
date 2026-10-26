const assert = require('node:assert/strict');
const test = require('node:test');

const { fixture } = require('./test-support/local-fixture.cjs');

function setup(t, overrides = {}) {
  const f = fixture(':memory:', { legacy: true, overrides });
  f.setPins([f.utils.mapPinDbToPin(f.db.select().from(f.schema.pins).get())]);
  t.after(f.close);
  return f;
}
async function downloaded(f) {
  const created = await f.formService.createForm(f.values);
  for (const op of f.operations()) f.queue.markCompleted(op, { version: 1 });
  return f.formService.getFormById(created.id);
}

test('legacy initial/manual sync uses existing collection routes without the snapshot endpoint', async (t) => {
  const f = setup(t, {
    '~/services/api/client': {
      request() {
        assert.fail('new endpoint requested');
      },
    },
  });
  const service = f.load('services/sync/syncService.ts');
  await service.performFullSync();
  assert.equal(f.db.select().from(f.schema.pins).all().length, 1);
});

test('a failed forms download makes no partial pin changes', async (t) => {
  const f = setup(t, {
    '~/services/api/formsApi': {
      fetchForms: async () => ({ success: false, error: 'QA network failure' }),
    },
  });
  f.setPins([{ ...f.pin, name: 'QA new pin label', version: 2 }]);
  await assert.rejects(f.pulls.pullLegacyCollections(), /network failure/);
  assert.equal(f.db.select().from(f.schema.pins).get().name, f.pin.name);
});

test('legacy downloads preserve pending answers and confirmed remote deletions remove only clean rows', async (t) => {
  const f = setup(t);
  const clean = await downloaded(f);
  const pending = await f.formService.createForm({ ...f.values, name: 'QA phone-only answer' });
  f.setForms([]);
  await f.pulls.pullLegacyCollections();
  assert.equal(await f.formService.getFormById(clean.id), null);
  assert.equal((await f.formService.getFormById(pending.id)).name, 'QA phone-only answer');
});

test('absence plus an inconclusive confirmation cannot delete a local response', async (t) => {
  const f = setup(t, {
    '~/services/api/formsApi': {
      fetchForms: async () => ({ success: true, data: [] }),
      fetchForm: async () => ({ success: false, error: 'HTTP 500: unavailable' }),
    },
  });
  const form = await downloaded(f);
  await f.pulls.pullLegacyCollections();
  assert.ok(await f.formService.getFormById(form.id));
});

test('a new pin between the two collection reads rejects the inconsistent pair before writing', async (t) => {
  const f = setup(t);
  const form = await downloaded(f);
  f.setPins([]);
  f.setForms([form]);
  const before = f.sqlite.prepare('SELECT total_changes() n').get().n;
  await assert.rejects(f.pulls.pullLegacyCollections(), /Invalid form/);
  assert.equal(f.sqlite.prepare('SELECT total_changes() n').get().n, before);
});

test('a legacy create remains blank in its actual upload and is acknowledged once', async (t) => {
  const f = setup(t);
  const created = await f.formService.createForm({
    ...f.values,
    name: '',
    villageId: '',
    householdNumber: '',
    age: null,
  });
  await f.syncQueue.processQueue();
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
    await f.syncQueue.processQueue();
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
  await f.syncQueue.processQueue();
  assert.equal(f.calls.filter((call) => call.entityType === 'form').length, 0);
  assert.equal((await f.formService.getFormById(form.id)).status, 'unsynced');
});

test('an existing UUID with different content blocks create instead of overwriting it', async (t) => {
  const f = setup(t);
  const created = await f.formService.createForm(f.values);
  const full = await f.formService.getFormById(created.id);
  f.setForms([{ ...full, name: 'QA different server content', version: 3 }]);
  await f.syncQueue.processQueue();
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
  await f.syncQueue.processQueue();
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
  await f.syncQueue.processQueue();
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
  await f.syncQueue.processQueue();
  assert.equal((await f.formService.getFormById(form.id)).name, f.values.name);
  assert.equal((await f.formService.getFormById(form.id)).status, 'unsynced');
});
