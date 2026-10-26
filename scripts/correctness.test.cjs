const assert = require('node:assert/strict');
const test = require('node:test');

const { fixture } = require('./test-support/local-fixture.cjs');

function setup(t, options) {
  const f = fixture(':memory:', options);
  t.after(f.close);
  return f;
}

test('a missing reset marker must never erase a saved response or outbox', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  await assert.rejects(
    f.load('services/sync/localDataReset.ts').resetLocalDataOnce(),
    /review|saved|pending/i
  );
  assert.ok(await f.formService.getFormById(form.id));
  assert.equal(f.operations().length, 2);
});

test('an older download arriving after a newer one must not regress answers or version', async (t) => {
  const f = setup(t);
  const form = await f.formService.createForm(f.values);
  for (const op of f.operations()) f.queue.markCompleted(op, { version: 3 });
  f.setForms([{ ...form, name: 'QA current', version: 3 }]);
  await f.pulls.pullAllForms();
  f.setForms([{ ...form, name: 'QA stale download', version: 2 }]);
  await f.pulls.pullAllForms();
  assert.equal((await f.formService.getFormById(form.id)).name, 'QA current');
  assert.equal((await f.formService.getFormById(form.id)).version, 3);
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
