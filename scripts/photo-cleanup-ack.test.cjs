const assert = require('node:assert/strict');
const test = require('node:test');

const { fixture } = require('./test-support/local-fixture.cjs');

async function photoRemoval(t, { cleanup } = {}) {
  const cleanupCalls = [];
  const f = fixture(':memory:', {
    overrides: {
      '~/services/api/storageApi': {
        deleteObjects: async (keys) => {
          cleanupCalls.push(keys);
          return cleanup ? cleanup(keys) : { success: true, data: {} };
        },
      },
    },
  });
  t.after(f.close);
  f.sqlite.prepare('UPDATE pins SET images=? WHERE id=?').run(JSON.stringify(['qa.jpg']), f.pin.id);
  f.setPins([await f.pinService.getPinById(f.pin.id)]);
  await f.pinService.updatePin(f.pin.id, { name: 'QA first edit', images: [] });
  return { f, cleanupCalls };
}

for (const failure of ['http', 'network']) {
  test(`remote-photo cleanup ${failure} failure cannot discard a committed pin ACK or its version`, async (t) => {
    const { f, cleanupCalls } = await photoRemoval(t, {
      cleanup: async () => {
        if (failure === 'network') throw new Error('Network timeout');
        return { success: false, error: 'HTTP 403: storage permission denied' };
      },
    });
    f.setSyncResponse(async (request) => {
      const remote = { ...request.payload, version: request.payload.version + 1 };
      f.setPins([remote]);
      return { success: true, data: remote };
    });
    assert.deepEqual(await f.syncQueue.uploadPendingChanges(), {
      uploaded: 1,
      failed: 0,
      blocked: 0,
      remaining: 0,
      errors: [],
    });
    assert.equal(cleanupCalls.length, 1);
    assert.equal((await f.pinService.getPinById(f.pin.id)).version, 2);
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 0);
    await f.pinService.updatePin(f.pin.id, { name: 'QA next edit after storage failure' });
    assert.equal((await f.syncQueue.uploadPendingChanges()).remaining, 0);
    assert.equal((await f.pinService.getPinById(f.pin.id)).version, 3);
  });
}

for (const invalid of ['identity', 'version', 'content']) {
  test(`remote originals are retained when the pin ACK has invalid ${invalid}`, async (t) => {
    const { f, cleanupCalls } = await photoRemoval(t);
    f.setSyncResponse(async (request) => ({
      success: true,
      data: {
        ...request.payload,
        version: request.payload.version + 1,
        ...(invalid === 'identity' ? { id: 'qa-wrong-pin' } : {}),
        ...(invalid === 'version' ? { version: 0 } : {}),
        ...(invalid === 'content' ? { images: ['qa.jpg'] } : {}),
      },
    }));
    assert.equal((await f.syncQueue.uploadPendingChanges()).failed, 1);
    assert.equal(cleanupCalls.length, 0);
    assert.equal((await f.pinService.getPinById(f.pin.id)).status, 'unsynced');
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM sync_inflight').get().n, 1);
  });
}

test('matching pin acknowledgement permits removal of only its obsolete remote photos', async (t) => {
  const { f, cleanupCalls } = await photoRemoval(t);
  assert.equal((await f.syncQueue.uploadPendingChanges()).remaining, 0);
  assert.deepEqual(cleanupCalls, [[`pins/${f.pin.id}/qa.jpg`]]);
});
