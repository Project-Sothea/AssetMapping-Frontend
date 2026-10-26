/* global __dirname */
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ts = require('typescript');

const { drizzle } = require('../../node_modules/drizzle-orm/expo-sqlite/driver.cjs');

// Use the installed Expo Drizzle driver's actual SQL against real SQLite. Only
// native statement transport, HTTP, images and background timers are substituted.
function fixture(filename = ':memory:', options = {}) {
  const sqlite = new DatabaseSync(filename, { enableDoubleQuotedStringLiterals: true });
  for (const name of fs
    .readdirSync(path.join(__dirname, '../../drizzle'))
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    if (!options.reopen)
      sqlite.exec(fs.readFileSync(path.join(__dirname, '../../drizzle', name), 'utf8'));
  }
  sqlite.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
  const client = {
    prepareSync(sql) {
      const stmt = sqlite.prepare(sql);
      return {
        executeSync(params) {
          if (/^\s*(select|pragma)/i.test(sql))
            return {
              getAllSync: () => stmt.all(...params),
              getFirstSync: () => stmt.get(...params),
            };
          return stmt.run(...params);
        },
        executeForRawResultSync(params) {
          stmt.setReturnArrays(true);
          return { getAllSync: () => stmt.all(...params) };
        },
      };
    },
  };
  const db = drizzle(client);
  const storage = new Map(options.storage ?? []);
  let remoteForms = [];
  let remotePins = [];
  let calls = [];
  let syncResponse = async (request) => ({
    success: true,
    data:
      request.operation === 'delete'
        ? { id: request.payload.id, deleted: true }
        : {
            ...request.payload,
            version: request.operation === 'create' ? 1 : Number(request.payload.version) + 1,
          },
  });
  const cache = new Map();
  const root = path.resolve(__dirname, '../..');
  function load(filename) {
    filename = path.resolve(filename);
    if (!path.extname(filename)) filename += fs.existsSync(filename + '.ts') ? '.ts' : '.tsx';
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename, module);
    cache.set(filename, mod);
    mod.filename = filename;
    mod.paths = Module._nodeModulePaths(path.dirname(filename));
    const originalRequire = mod.require.bind(mod);
    mod.require = (id) => {
      if (options.overrides && id in options.overrides) return options.overrides[id];
      if (id === '@react-native-async-storage/async-storage')
        return {
          getItem: async (key) => storage.get(key) ?? null,
          setItem: async (key, value) => {
            storage.set(key, value);
          },
          removeItem: async (key) => {
            storage.delete(key);
          },
        };
      if (id === '~/services/apiUrl' || id.endsWith('/apiUrl'))
        return { getApiUrl: async () => options.apiUrl };
      if (id === '~/services/drizzleDb') return { db };
      if (id === 'expo-file-system/legacy')
        return {
          createUploadTask() {
            throw new Error('Native image upload is outside this host fixture.');
          },
          FileSystemSessionType: {},
          FileSystemUploadType: {},
        };
      if (id === 'expo-file-system/next')
        return {
          File: class {
            exists = true;
            size = 1;
          },
        };
      if (id === '~/hooks/RealTimeSync/useTransferState')
        return { useTransferState: () => ({ busy: false, setupReady: true }) };
      if (id === '~/services/sync/transferCoordinator') return { assertLocalWritesAllowed() {} };
      if (id === '~/services/sync/protocol' || id === './protocol')
        return { isLegacySync: options.legacy === true };
      if (id === '~/services/images/ImageManager')
        return { deleteImagesByFilename: async () => {}, getLocalPath: () => '' };
      if (id === '~/services/api/storageApi') return {};
      if (!options.apiUrl && id === '~/services/api/syncApi')
        return {
          sync: async (request) => {
            calls.push(request);
            return syncResponse(request);
          },
        };
      if (!options.apiUrl && id === '~/services/api/formsApi')
        return {
          fetchForms: async () => ({ success: true, data: remoteForms }),
          fetchFormsSince: async () => ({ success: true, data: remoteForms }),
          fetchForm: async (id) =>
            remoteForms.some((f) => f.id === id)
              ? { success: true, data: remoteForms.find((f) => f.id === id) }
              : { success: false, error: 'HTTP 404: Form not found' },
        };
      if (!options.apiUrl && id === '~/services/api/pinsApi')
        return {
          fetchPins: async () => ({ success: true, data: remotePins }),
          fetchPinsSince: async () => ({ success: true, data: remotePins }),
          fetchPin: async (id) =>
            remotePins.some((p) => p.id === id)
              ? { success: true, data: remotePins.find((p) => p.id === id) }
              : { success: false, error: 'HTTP 404: Pin not found' },
        };
      if (id.startsWith('~/')) return load(path.join(root, id.slice(2)));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), id));
      return originalRequire(id);
    };
    const source = fs.readFileSync(filename, 'utf8');
    mod._compile(
      ts.transpileModule(source, {
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText,
      filename
    );
    return mod.exports;
  }
  const schema = load(path.join(root, 'db/schema.ts'));
  const utils = load(path.join(root, 'db/utils.ts'));
  const formService = load(path.join(root, 'features/forms/services/FormService.ts'));
  const pinService = load(path.join(root, 'features/pins/services/PinService.ts'));
  const queue = load(path.join(root, 'services/sync/queue/queueOperations.ts'));
  const pulls = load(path.join(root, 'scripts/test-support/pull-updates.ts'));
  const syncQueue = load(path.join(root, 'services/sync/queue/syncQueue.ts'));
  load(path.join(root, 'services/sync/transferCoordinator.ts')).finishSetup();
  const tools = load(path.join(root, 'scripts/test-support/sync-tools.ts'));
  const pin = {
    id: 'qa-pin',
    name: 'QA household',
    lat: 1,
    lng: 2,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    version: 1,
    status: 'synced',
    images: [],
  };
  if (options.pinId) pin.id = options.pinId;
  if (!options.reopen) db.insert(schema.pins).values(utils.sanitizePinForDb(pin)).run();
  if (!options.reopen) remotePins = [pin];
  const values = {
    pinId: pin.id,
    name: 'QA synthetic',
    village: 'QA village',
    villageId: 'QA-1',
    age: null,
    gender: '',
    longTermConditions: ['QA option'],
    handwashingBeforeMeals: '',
  };
  function operations() {
    return sqlite.prepare('SELECT * FROM sync_queue ORDER BY sequenceNumber').all();
  }
  function failQueue(operation) {
    sqlite.exec(
      `CREATE TRIGGER qa_fail BEFORE ${operation} ON sync_queue WHEN NEW.entityType = 'form' BEGIN SELECT RAISE(ABORT, 'QA injected outbox failure'); END`
    );
  }
  return {
    sqlite,
    storage,
    // Older companion backend tests use the retired full-sync fixture API.
    // Keep that alias here only; production syncService exports setup only.
    load: (file) =>
      file === 'services/sync/syncService.ts'
        ? { ...load(path.join(root, file)), ...tools }
        : load(path.join(root, file)),
    db,
    schema,
    utils,
    formService,
    pinService,
    queue,
    pulls,
    // Exercise the production manual worker, retaining the old host-driver name.
    syncQueue: { ...syncQueue, processQueue: () => syncQueue.uploadPendingChanges() },
    pin,
    values,
    operations,
    failQueue,
    setForms: (data) => {
      remoteForms = data;
    },
    setPins: (data) => {
      remotePins = data;
    },
    calls,
    setSyncResponse: (fn) => {
      syncResponse = fn;
    },
    close: () => sqlite.close(),
  };
}

module.exports = { fixture };
