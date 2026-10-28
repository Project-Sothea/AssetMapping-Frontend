const assert = require('node:assert/strict');
const test = require('node:test');

const { fixture } = require('./test-support/local-fixture.cjs');

function setup(t) {
  const f = fixture();
  t.after(f.close);
  f.validation = f.load('services/sync/queue/validateQueuedOperation.ts');
  return f;
}

async function queuedPin(f, id = 'qa-candidate') {
  await f.pinService.createPin({ id, name: `Synthetic ${id}`, lat: 1, lng: 2, images: [] });
  return f.operations().find((op) => op.entityId === id);
}

function rewriteQueue(f, op, changes) {
  for (const [key, value] of Object.entries(changes)) {
    if (!['operation', 'payload', 'writeOrigin', 'idempotencyKey'].includes(key))
      throw new Error('Unsupported synthetic test field');
    f.sqlite.prepare(`UPDATE sync_queue SET ${key}=? WHERE id=?`).run(value, op.id);
  }
  return f.operations().find((row) => row.id === op.id);
}

test('a stale queued answer is rejected before staging or HTTP even with otherwise valid metadata', async (t) => {
  const f = setup(t);
  const op = await queuedPin(f);
  const stale = rewriteQueue(f, op, {
    payload: JSON.stringify({ ...JSON.parse(op.payload), name: 'Synthetic stale answer' }),
  });
  await assert.rejects(f.queue.processOperation(stale), /differs from the saved record/i);
  assert.throws(() => f.queue.stageOperation(stale), /differs from the saved record/i);
  assert.equal(f.calls.length, 0);
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 0);
});

test('a same-key journal cannot substitute another payload for the persisted queue revision', async (t) => {
  const f = setup(t);
  const op = await queuedPin(f);
  f.queue.stageOperation(op);
  const changed = {
    ...op,
    payload: JSON.stringify({ ...JSON.parse(op.payload), name: 'Synthetic altered journal' }),
  };
  f.sqlite
    .prepare('UPDATE sync_inflight SET operation=? WHERE key=?')
    .run(JSON.stringify(changed), op.idempotencyKey);
  await assert.rejects(f.queue.processOperation(changed), /differs from the queued revision/i);
  assert.equal(f.calls.length, 0);
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 1);
});

for (const field of ['queueId', 'entityType', 'entityId']) {
  test(`journal outer ${field} must agree with its encoded operation before any request`, async (t) => {
    const f = setup(t);
    const op = await queuedPin(f);
    f.queue.stageOperation(op);
    f.sqlite
      .prepare(`UPDATE sync_inflight SET ${field}=? WHERE key=?`)
      .run(field === 'entityType' ? 'form' : 'qa-unrelated', op.idempotencyKey);
    await assert.rejects(f.queue.processOperation(op), /journal does not match/i);
    assert.equal(f.calls.length, 0);
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 1);
  });
}

test('unknown legacy create cannot be silently cancelled as never transmitted when deleted', async (t) => {
  const f = setup(t);
  const op = await queuedPin(f);
  rewriteQueue(f, op, { writeOrigin: null });
  await f.pinService.deletePin(op.entityId);
  const deletion = f.operations().find((row) => row.entityId === op.entityId);
  assert.ok(deletion, 'Unknown legacy creation may have reached the server; keep deletion');
  assert.equal(deletion.operation, 'delete');
  assert.equal(deletion.writeOrigin, f.validation.ATOMIC_WRITE_ORIGIN);
  assert.equal(deletion.status, 'pending');
  assert.doesNotThrow(() => f.validation.validateQueuedOperation(deletion));
});

test('a proven atomic create remains cancellable before any staging or attempt', async (t) => {
  const f = setup(t);
  const op = await queuedPin(f);
  assert.equal(op.writeOrigin, f.validation.ATOMIC_WRITE_ORIGIN);
  await f.pinService.deletePin(op.entityId);
  assert.equal(f.operations().filter((row) => row.entityId === op.entityId).length, 0);
});

test('editing an unknown legacy create cannot turn its uncertain transmission history into cancellation proof', async (t) => {
  const f = setup(t);
  const op = await queuedPin(f);
  rewriteQueue(f, op, { writeOrigin: null });
  await f.pinService.updatePin(op.entityId, { name: 'Synthetic reviewed local edit' });
  await f.pinService.deletePin(op.entityId);
  const deletion = f.operations().find((row) => row.entityId === op.entityId);
  assert.ok(
    deletion,
    'New edit does not prove that the original legacy create never reached server'
  );
  assert.equal(deletion.operation, 'delete');
  assert.equal(deletion.writeOrigin, f.validation.ATOMIC_WRITE_ORIGIN);
  assert.doesNotThrow(() => f.validation.validateQueuedOperation(deletion));
});

async function queuedDelete(f) {
  const op = await queuedPin(f);
  // A failed create could have committed: preserve the revision when it is deleted.
  f.sqlite.prepare('UPDATE sync_queue SET attempts=1 WHERE id=?').run(op.id);
  await f.pinService.deletePin(op.entityId);
  return f.operations().find((row) => row.entityId === op.entityId);
}

test('plausible legacy deletion metadata does not replace atomic write provenance', async (t) => {
  const f = setup(t);
  const deletion = await queuedDelete(f);
  const unknown = rewriteQueue(f, deletion, { writeOrigin: null });
  assert.ok(unknown.idempotencyKey && unknown.createdAt && unknown.deviceId);
  await assert.rejects(f.queue.processOperation(unknown), /no verified local deletion/i);
  assert.throws(() => f.queue.stageOperation(unknown), /no verified local deletion/i);
  assert.equal(f.calls.length, 0);
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 0);
});

test('an in-memory origin cannot upgrade an untrusted persisted deletion', async (t) => {
  const f = setup(t);
  const deletion = await queuedDelete(f);
  rewriteQueue(f, deletion, { writeOrigin: null });
  await assert.rejects(f.queue.processOperation(deletion), /queued revision|deletion record/i);
  assert.equal(f.calls.length, 0);
});

test('an unstaged delete cannot remove an entity that still exists locally', async (t) => {
  const f = setup(t);
  const op = await queuedPin(f);
  const deletion = rewriteQueue(f, op, { operation: 'delete' });
  await assert.rejects(f.queue.processOperation(deletion), /no verified local deletion/i);
  assert.equal(f.calls.length, 0);
});

test('a partial create payload cannot borrow missing required answers from the local row', async (t) => {
  const f = setup(t);
  const op = await queuedPin(f);
  const payload = JSON.parse(op.payload);
  delete payload.name;
  const partial = rewriteQueue(f, op, { payload: JSON.stringify(payload) });
  await assert.rejects(f.queue.processOperation(partial), /required field name is missing/i);
  assert.equal(f.calls.length, 0);
});

test('a held stale revision does not stop an unrelated valid change uploading', async (t) => {
  const f = setup(t);
  const stale = await queuedPin(f, 'qa-stale');
  rewriteQueue(f, stale, {
    payload: JSON.stringify({ ...JSON.parse(stale.payload), name: 'Synthetic stale queue' }),
  });
  const valid = await queuedPin(f, 'qa-valid');
  const result = await f.syncQueue.uploadPendingChanges();
  assert.equal(result.uploaded, 1);
  assert.equal(result.remaining, 1);
  assert.ok(result.errors.some((error) => error.entityId === stale.entityId));
  assert.deepEqual(
    f.calls.map((request) => request.payload.id),
    [valid.entityId]
  );
  assert.equal(f.operations().find((row) => row.id === stale.id).status, 'failed');
});

test('a malformed recovery record is preserved without aborting unrelated uploads', async (t) => {
  const f = setup(t);
  f.sqlite
    .prepare(
      'INSERT INTO sync_inflight (key,queueId,entityType,entityId,operation,status) VALUES (?,?,?,?,?,?)'
    )
    .run('qa-malformed-key', 'qa-malformed-queue', 'pin', 'qa-malformed-pin', 'not JSON', 'failed');
  const valid = await queuedPin(f, 'qa-valid');
  const result = await f.syncQueue.uploadPendingChanges();
  assert.equal(result.uploaded, 1);
  assert.equal(result.remaining, 1);
  assert.deepEqual(
    f.calls.map((request) => request.payload.id),
    [valid.entityId]
  );
  assert.equal(
    f.sqlite.prepare('SELECT operation FROM sync_inflight WHERE key=?').get('qa-malformed-key')
      .operation,
    'not JSON'
  );
});

test('a journal with a copied inner key cannot fail or retire the real journal it points at', async (t) => {
  const f = setup(t);
  const valid = await queuedPin(f, 'qa-valid');
  const copied = JSON.stringify(valid);
  const outerKey = 'qa-copied-outer-key';
  // Put the malformed row first so its rejection happens before valid replay.
  f.sqlite
    .prepare(
      'INSERT INTO sync_inflight (key,queueId,entityType,entityId,operation,status) VALUES (?,?,?,?,?,?)'
    )
    .run(outerKey, valid.id, valid.entityType, valid.entityId, copied, 'pending');
  f.queue.stageOperation(valid);
  const result = await f.syncQueue.uploadPendingChanges();
  assert.equal(result.uploaded, 1);
  assert.equal(result.remaining, 1);
  assert.equal(f.operations().find((row) => row.id === valid.id).status, 'completed');
  assert.deepEqual(
    f.calls.map((request) => request.payload.id),
    [valid.entityId]
  );
  assert.equal(
    f.sqlite.prepare('SELECT count(*) n FROM sync_inflight WHERE key=?').get(valid.idempotencyKey)
      .n,
    0
  );
  assert.deepEqual(
    { ...f.sqlite.prepare('SELECT operation,status FROM sync_inflight WHERE key=?').get(outerKey) },
    { operation: copied, status: 'failed' }
  );
});

for (const malformed of ['null', '[]']) {
  test(`a pending journal containing ${malformed} does not prevent a valid upload`, async (t) => {
    const f = setup(t);
    f.sqlite
      .prepare(
        'INSERT INTO sync_inflight (key,queueId,entityType,entityId,operation,status) VALUES (?,?,?,?,?,?)'
      )
      .run('qa-invalid-key', 'qa-invalid-queue', 'pin', 'qa-invalid-pin', malformed, 'pending');
    const valid = await queuedPin(f, 'qa-valid');
    const result = await f.syncQueue.uploadPendingChanges();
    assert.equal(result.uploaded, 1);
    assert.equal(result.remaining, 1);
    assert.deepEqual(
      f.calls.map((request) => request.payload.id),
      [valid.entityId]
    );
    assert.deepEqual(
      {
        ...f.sqlite
          .prepare('SELECT operation,status FROM sync_inflight WHERE key=?')
          .get('qa-invalid-key'),
      },
      { operation: malformed, status: 'failed' }
    );
  });
}

for (const queueState of ['same revision', 'missing']) {
  test(`an exact journal cannot falsely sync a newer untracked local answer when its queue is ${queueState}`, async (t) => {
    const f = setup(t);
    const op = await queuedPin(f);
    f.queue.stageOperation(op);
    const originalJournal = f.sqlite
      .prepare('SELECT operation FROM sync_inflight WHERE key=?')
      .get(op.idempotencyKey).operation;
    // Simulate an interrupted legacy write that persisted the newer row but not
    // its matching new queue revision. Its answer must not be marked uploaded.
    f.sqlite
      .prepare('UPDATE pins SET name=?,status=? WHERE id=?')
      .run('Synthetic newer untracked answer', 'unsynced', op.entityId);
    if (queueState === 'missing') f.sqlite.prepare('DELETE FROM sync_queue WHERE id=?').run(op.id);
    const result = await f.syncQueue.uploadPendingChanges();
    assert.equal(result.uploaded, 0);
    assert.equal(result.remaining, 1);
    assert.equal(f.calls.length, 0);
    const saved = await f.pinService.getPinById(op.entityId);
    assert.equal(saved.name, 'Synthetic newer untracked answer');
    assert.equal(saved.status, 'unsynced');
    assert.equal(
      f.sqlite.prepare('SELECT operation FROM sync_inflight WHERE key=?').get(op.idempotencyKey)
        .operation,
      originalJournal
    );
    if (queueState === 'missing') assert.equal(f.operations().length, 0);
  });
}

test('a deletion journal cannot erase a live local row recreated without a newer queue revision', async (t) => {
  const f = setup(t);
  const deletion = await queuedDelete(f);
  f.queue.stageOperation(deletion);
  const restored = {
    ...JSON.parse(deletion.payload),
    name: 'Synthetic live restored household',
    status: 'unsynced',
  };
  f.db.insert(f.schema.pins).values(f.utils.sanitizePinForDb(restored)).run();
  const result = await f.syncQueue.uploadPendingChanges();
  assert.equal(result.uploaded, 0);
  assert.equal(result.remaining, 1);
  assert.equal(f.calls.length, 0);
  assert.equal((await f.pinService.getPinById(deletion.entityId)).name, restored.name);
  assert.equal(f.operations().find((op) => op.id === deletion.id).status, 'failed');
});

test('an older journal still replays before a different newer tracked queue revision', async (t) => {
  const f = setup(t);
  const original = await queuedPin(f);
  f.queue.stageOperation(original);
  await f.pinService.updatePin(original.entityId, { name: 'Synthetic newer tracked answer' });
  const latest = f.operations().find((op) => op.id === original.id);
  assert.notEqual(latest.idempotencyKey, original.idempotencyKey);
  f.setSyncResponse(async (request) => {
    const data = {
      ...request.payload,
      version: request.operation === 'create' ? 1 : Number(request.payload.version) + 1,
    };
    f.setPins([data]);
    return { success: true, data };
  });
  const result = await f.syncQueue.uploadPendingChanges();
  assert.equal(result.remaining, 0);
  assert.equal(result.uploaded, 2);
  assert.deepEqual(
    f.calls.map((request) => request.payload.name),
    [JSON.parse(original.payload).name, 'Synthetic newer tracked answer']
  );
  const saved = await f.pinService.getPinById(original.entityId);
  assert.equal(saved.name, 'Synthetic newer tracked answer');
  assert.equal(saved.status, 'synced');
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 0);
});
