/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ts = require('typescript');

const { fixture } = require('./test-support/local-fixture.cjs');

test('manual upload processes more than ten queued rows in one protected session', async (t) => {
  const f = fixture();
  t.after(f.close);
  const transfer = f.load('services/sync/transferCoordinator.ts');
  transfer.finishSetup();
  for (let i = 0; i < 25; i++)
    await f.pinService.createPin({
      id: `qa-manual-${i}`,
      name: `QA ${i}`,
      lat: 1,
      lng: 2,
      images: [],
    });
  assert.equal(f.calls.length, 0);
  const result = await f.syncQueue.uploadPendingChanges();
  assert.equal(result.uploaded, 25);
  assert.equal(result.failed, 0);
  assert.equal(result.remaining, 0);
  assert.equal(f.calls.length, 25);
  assert.ok(f.operations().every((op) => op.status === 'completed'));
});

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

test('one listener shared by several tables refreshes once per notification burst', () => {
  const source = fs.readFileSync(path.join(__dirname, '../shared/utils/tableChanges.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const sandbox = { exports: {} };
  vm.runInNewContext(outputText, sandbox);
  let flush;
  let refreshes = 0;
  const batcher = sandbox.exports.createTableChangeBatcher((callback) => {
    flush = callback;
  });
  const refresh = () => refreshes++;
  batcher.subscribe('pins', refresh);
  batcher.subscribe('forms', refresh);
  batcher.changed('pins');
  batcher.changed('forms');
  flush();
  assert.equal(refreshes, 1);
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
