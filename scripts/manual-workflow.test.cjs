/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ts = require('typescript');

const { fixture } = require('./test-support/local-fixture.cjs');

test('ordinary builds default to production-compatible sync; QA/durable are explicit', () => {
  const source = fs.readFileSync(path.join(__dirname, '../services/sync/protocol.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const sandbox = { exports: {}, process: { env: {} } };
  vm.runInNewContext(outputText, sandbox);
  const { resolveSyncProtocol, isLegacySync } = sandbox.exports;
  assert.equal(isLegacySync, true);
  assert.equal(resolveSyncProtocol(undefined, undefined), 'legacy');
  assert.equal(resolveSyncProtocol('standard', undefined), 'legacy');
  assert.equal(resolveSyncProtocol('qa', undefined), 'durable');
  assert.equal(resolveSyncProtocol('standard', 'durable'), 'durable');
  assert.equal(resolveSyncProtocol('qa', 'legacy'), 'legacy');
  assert.throws(() => resolveSyncProtocol('standard', 'invalid'));
});

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
