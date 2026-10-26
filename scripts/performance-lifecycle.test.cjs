const assert = require('node:assert/strict');
const test = require('node:test');

const { fixture } = require('./test-support/local-fixture.cjs');
function setup(t, options = {}) {
  const f = fixture(':memory:', options);
  t.after(f.close);
  return f;
}

test('50 image consumers share one URL lookup and one download', async (t) => {
  const f = setup(t);
  let lookups = 0,
    downloads = 0,
    finish;
  const loader = f.load('shared/utils/sharedImageLoader.ts').createSharedImageLoader({
    exists: () => false,
    local: () => '',
    remote: async () => {
      lookups++;
      return 'https://qa.invalid';
    },
    cache: async () => {
      downloads++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  });
  const jobs = Array.from({ length: 50 }, () => loader('p', 'same.jpg'));
  while (!finish) await Promise.resolve();
  assert.equal(lookups, 1);
  assert.equal(downloads, 1);
  finish('file:///same.jpg');
  assert.ok((await Promise.all(jobs)).every((uri) => uri === 'file:///same.jpg'));
});

test('image loading never exceeds four concurrent network/file operations', async (t) => {
  const f = setup(t);
  let active = 0,
    peak = 0;
  const loader = f.load('shared/utils/sharedImageLoader.ts').createSharedImageLoader({
    exists: () => false,
    local: () => '',
    remote: async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setImmediate(resolve));
      return 'https://qa.invalid';
    },
    cache: async () => {
      active--;
      return 'file:///qa.jpg';
    },
  });
  await Promise.all(Array.from({ length: 100 }, (_, i) => loader('p', `${i}.jpg`)));
  assert.equal(peak, 4);
  assert.equal(active, 0);
});

test('a failed image download releases its slot and permits retry', async (t) => {
  const f = setup(t);
  let calls = 0;
  const loader = f.load('shared/utils/sharedImageLoader.ts').createSharedImageLoader(
    {
      exists: () => false,
      local: () => '',
      remote: async () => {
        if (++calls === 1) throw new Error('QA offline');
        return 'https://qa.invalid';
      },
      cache: async () => 'file:///qa.jpg',
    },
    1
  );
  await assert.rejects(loader('p', 'a.jpg'));
  assert.equal(await loader('p', 'a.jpg'), 'file:///qa.jpg');
});

test('form and pending-queue queries use the new indexes', (t) => {
  const f = setup(t);
  const form = f.sqlite
    .prepare('EXPLAIN QUERY PLAN SELECT * FROM forms WHERE pinId=?')
    .all('qa-pin');
  const queue = f.sqlite
    .prepare(
      "EXPLAIN QUERY PLAN SELECT * FROM sync_queue WHERE status='pending' ORDER BY sequenceNumber LIMIT 10"
    )
    .all();
  assert.ok(form.some((r) => r.detail.includes('forms_pin_id_idx')));
  assert.ok(queue.some((r) => r.detail.includes('queue_pending_order_idx')));
});

function socketFixture(t) {
  const prior = globalThis.WebSocket;
  const sockets = [];
  let refreshes = 0;
  class Socket {
    static OPEN = 1;
    static CONNECTING = 0;
    readyState = 0;
    constructor(url) {
      this.url = url;
      sockets.push(this);
    }
    close() {
      this.readyState = 3;
      this.onclose?.();
    }
    open() {
      this.readyState = 1;
      this.onopen?.();
    }
    send() {}
  }
  globalThis.WebSocket = Socket;
  t.after(() => {
    globalThis.WebSocket = prior;
  });
  const f = setup(t, {
    apiUrl: 'http://127.0.0.1:3300',
    overrides: {
      '~/services/sync/syncService': {
        performIncrementalSync: async () => {
          refreshes++;
        },
      },
    },
  });
  const { WebSocketManager } = f.load('services/websocket/WebSocketManager.ts');
  const manager = new WebSocketManager();
  t.after(() => manager.disconnect());
  return { manager, sockets, refreshes: () => refreshes };
}

test('twenty concurrent WebSocket connect calls create one socket', async (t) => {
  const f = socketFixture(t);
  await Promise.all(Array.from({ length: 20 }, () => f.manager.connect('qa-device')));
  assert.equal(f.sockets.length, 1);
  f.sockets[0].open();
  assert.equal(f.manager.isConnected(), true);
});

test('manual disconnect cancels an async connection before URL resolution finishes', async (t) => {
  const f = socketFixture(t);
  const connecting = f.manager.connect('qa-device');
  f.manager.disconnect();
  await connecting;
  assert.equal(f.sockets.length, 0);
  assert.equal(f.manager.getStatus().status, 'disconnected');
});

test('late close events from an old socket cannot disconnect or reconnect the new one', async (t) => {
  const f = socketFixture(t);
  await f.manager.connect('old');
  const oldClose = f.sockets[0].onclose;
  f.sockets[0].open();
  await f.manager.connect('new');
  f.sockets[1].open();
  oldClose();
  assert.equal(f.manager.isConnected(), true);
  assert.equal(f.manager.getStatus().status, 'connected');
  assert.equal(f.sockets.length, 2);
});

test('manual reconnect preserves connection status without starting a data transfer', async (t) => {
  const f = socketFixture(t);
  await f.manager.connect('qa-device');
  f.sockets[0].open();
  assert.equal(f.refreshes(), 0);
  f.manager.disconnect();
  await f.manager.connect('qa-device');
  f.sockets[1].open();
  assert.equal(f.refreshes(), 0);
});

test('unsubscribed WebSocket handlers receive no later notifications', async (t) => {
  const f = socketFixture(t);
  let messages = 0;
  await f.manager.connect('qa-device');
  f.sockets[0].open();
  const off = f.manager.onMessage(() => messages++);
  off();
  f.sockets[0].onmessage({ data: '{"type":"pin"}' });
  assert.equal(messages, 0);
});

test('one changed row preserves all unrelated row identities for memoized cards', (t) => {
  const f = setup(t);
  const { stableRows } = f.load('shared/utils/stableRows.ts');
  const previous = Array.from({ length: 209 }, (_, i) => ({
    id: String(i),
    name: `QA ${i}`,
    updatedAt: new Date(0),
  }));
  const next = previous.map((row, i) => ({
    ...row,
    updatedAt: new Date(0),
    name: i === 5 ? 'QA changed' : row.name,
  }));
  const result = stableRows(previous, next);
  assert.equal(result.filter((row, i) => row === previous[i]).length, 208);
  assert.notEqual(result[5], previous[5]);
});

test('unchanged grouped counts retain the array and trigger no dependent rerender', (t) => {
  const f = setup(t);
  const { stableRows } = f.load('shared/utils/stableRows.ts');
  const previous = [{ pinId: 'QA', count: 2 }];
  assert.equal(stableRows(previous, [{ pinId: 'QA', count: 2 }]), previous);
});

test('row identity stays attached to UUID through reordering and deletion', (t) => {
  const f = setup(t);
  const { stableRows } = f.load('shared/utils/stableRows.ts');
  const previous = [
    { id: 'a', name: 'QA a' },
    { id: 'b', name: 'QA b' },
  ];
  const result = stableRows(previous, [{ ...previous[1] }]);
  assert.equal(result[0], previous[1]);
});
