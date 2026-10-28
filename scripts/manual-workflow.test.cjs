/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { fixture } = require('./test-support/local-fixture.cjs');

test('canceling an unsent response is atomic if removing its outbox entry fails', async (t) => {
  const f = fixture();
  t.after(f.close);
  const form = await f.formService.createForm(f.values);
  f.sqlite.exec(
    "CREATE TRIGGER qa_cancel_fail BEFORE DELETE ON sync_queue WHEN OLD.entityType='form' BEGIN SELECT RAISE(ABORT,'QA cancellation failed'); END"
  );
  await assert.rejects(f.formService.deleteForm(form.id), /cancellation failed/);
  assert.ok(await f.formService.getFormById(form.id));
  assert.equal(f.operations().find((op) => op.entityType === 'form').operation, 'create');
});

test('a staged create cannot be canceled as though it was never sent', async (t) => {
  const f = fixture();
  t.after(f.close);
  const form = await f.formService.createForm(f.values);
  const original = f.operations().find((op) => op.entityType === 'form');
  f.queue.stageOperation(original);
  await f.formService.deleteForm(form.id);
  assert.equal(f.operations().find((op) => op.entityType === 'form').operation, 'delete');
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 1);
});

test('server error wording cannot misclassify a failed upload as a blocked revision', async (t) => {
  const f = fixture();
  t.after(f.close);
  await f.pinService.createPin({ id: 'qa-error-text', name: 'QA', lat: 1, lng: 2, images: [] });
  f.setSyncResponse(async () => ({
    success: false,
    error: 'An earlier revision: server unavailable',
  }));
  const result = await f.syncQueue.uploadPendingChanges();
  assert.equal(result.failed, 1);
  assert.equal(result.blocked, 0);
  assert.equal(result.remaining, 1);
});

test('production services expose setup and manual upload without retired scheduling paths', () => {
  const root = path.join(__dirname, '..');
  const setup = fs.readFileSync(path.join(root, 'services/sync/syncService.ts'), 'utf8');
  assert.doesNotMatch(setup, /performFullSync|performIncrementalSync|processQueue|pullSnapshot/);
  for (const name of ['queueState.ts', 'operationMerge.ts'])
    assert.equal(fs.existsSync(path.join(root, 'services/sync/queue', name)), false);
  for (const name of [
    'features/forms/services/FormService.ts',
    'features/pins/services/PinService.ts',
  ])
    assert.doesNotMatch(fs.readFileSync(path.join(root, name), 'utf8'), /scheduleNextProcess/);
  assert.equal(fs.existsSync(path.join(root, 'services/sync/pullUpdates.ts')), false);
});
