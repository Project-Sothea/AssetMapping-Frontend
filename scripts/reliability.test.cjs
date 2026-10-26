const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ts = require('typescript');

function loadUtility(name) {
  const source = fs.readFileSync(path.join(__dirname, '../shared/utils', `${name}.ts`), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const sandbox = { exports: {} };
  vm.runInNewContext(outputText, sandbox);
  return sandbox.exports;
}

test('a burst of 50 taps opens one screen; returning permits the next visit', () => {
  const gate = loadUtility('navigationGate').createNavigationGate();
  const visits = [];
  for (let i = 0; i < 50; i++) gate.run(() => visits.push('household-a'));
  assert.deepEqual(visits, ['household-a']);
  assert.equal(
    gate.run(() => visits.push('household-b')),
    false
  );
  gate.reset();
  assert.equal(
    gate.run(() => visits.push('household-b')),
    true
  );
  assert.deepEqual(visits, ['household-a', 'household-b']);
});

test('a navigation exception releases the gate for a retry', () => {
  const gate = loadUtility('navigationGate').createNavigationGate();
  assert.throws(
    () =>
      gate.run(() => {
        throw new Error('dispatch failed');
      }),
    /dispatch failed/
  );
  assert.equal(
    gate.run(() => {}),
    true
  );
});

test('startup, reconnect and manual requests share one in-progress sync', async () => {
  const states = [];
  const flight = loadUtility('singleFlight').createSingleFlight(() =>
    states.push(flight.isRunning())
  );
  let finish;
  let starts = 0;
  const work = new Promise((resolve) => {
    finish = resolve;
  });
  const first = flight.run(async () => {
    starts++;
    await work;
  });
  const concurrent = Array.from({ length: 20 }, () =>
    flight.run(async () => {
      starts++;
    })
  );
  for (const request of concurrent) assert.equal(request, first);
  assert.equal(flight.isRunning(), true);
  await Promise.resolve();
  assert.equal(starts, 1);
  finish();
  await first;
  assert.deepEqual(states, [true, false]);
  await flight.run(async () => {
    starts++;
  });
  assert.equal(starts, 2);
});

test('a failed sync releases activity state and permits a fresh attempt', async () => {
  const flight = loadUtility('singleFlight').createSingleFlight();
  const failing = flight.run(async () => {
    throw new Error('network unavailable');
  });
  assert.equal(
    flight.run(async () => {}),
    failing
  );
  await assert.rejects(failing, /network unavailable/);
  assert.equal(flight.isRunning(), false);
  await flight.run(async () => {});
  assert.equal(flight.isRunning(), false);
});
/* global __dirname */

test('hundreds of row changes schedule one refresh per affected table', () => {
  const scheduled = [];
  const changes = loadUtility('tableChanges').createTableChangeBatcher((flush) =>
    scheduled.push(flush)
  );
  let forms = 0;
  let pins = 0;
  const off = changes.subscribe('forms', () => forms++);
  changes.subscribe('pins', () => pins++);
  for (let i = 0; i < 278; i++) changes.changed('forms');
  for (let i = 0; i < 209; i++) changes.changed('pins');
  assert.equal(scheduled.length, 1);
  scheduled.shift()();
  assert.equal(forms, 1);
  assert.equal(pins, 1);
  changes.changed('forms');
  off();
  scheduled.shift()();
  assert.equal(forms, 1);
});
