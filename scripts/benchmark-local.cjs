const assert = require('node:assert/strict');
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');

const { FORM_ARRAY_FIELDS } = require('@assetmapping/shared-types');
const { getTableColumns } = require('drizzle-orm');

const { fixture } = require('./test-support/local-fixture.cjs');
fs.mkdirSync('.expo', { recursive: true });
const report = [];
function timings(work, repeats = 100) {
  const times = [];
  for (let i = 0; i < repeats; i++) {
    const start = performance.now();
    work();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return {
    medianMs: times[Math.floor(times.length / 2)],
    p95Ms: times[Math.floor(times.length * 0.95)],
  };
}
for (const scale of [1, 2, 5, 10]) {
  const f = fixture();
  const countPins = 209 * scale,
    countForms = 278 * scale;
  const now = new Date();
  const pins = Array.from({ length: countPins - 1 }, (_, i) =>
    f.utils.sanitizePinForDb({ ...f.pin, id: `qa-pin-${i + 1}`, name: `QA pin ${i + 1}` })
  );
  const defaults = {};
  for (const [key, column] of Object.entries(getTableColumns(f.schema.forms))) {
    if (['id', 'pinId', 'createdAt', 'updatedAt', 'version', 'status'].includes(key)) continue;
    defaults[key] = FORM_ARRAY_FIELDS.includes(key)
      ? ['QA selected', 'QA option']
      : column.dataType === 'number'
        ? 30
        : column.dataType === 'boolean'
          ? false
          : 'QA synthetic response';
  }
  f.db.transaction((tx) => {
    for (let i = 0; i < pins.length; i += 100)
      tx.insert(f.schema.pins)
        .values(pins.slice(i, i + 100))
        .run();
    for (let i = 0; i < countForms; i++)
      tx.insert(f.schema.forms)
        .values(
          f.utils.sanitizeFormForDb({
            ...defaults,
            id: `qa-form-${i}`,
            pinId: i < 48 * scale ? f.pin.id : `qa-pin-${1 + ((i - 48 * scale) % (countPins - 1))}`,
            createdAt: now,
            updatedAt: now,
            version: 1,
            status: 'synced',
          })
        )
        .run();
  });
  const query = () => f.sqlite.prepare('SELECT * FROM forms WHERE pinId=?').all(f.pin.id);
  const summary = timings(() =>
    f.sqlite
      .prepare(
        'SELECT id,pinId,name,village,createdAt,updatedAt,version,status FROM forms WHERE pinId=?'
      )
      .all(f.pin.id)
  );
  const indexed = timings(query);
  const indexedPlan = f.sqlite
    .prepare('EXPLAIN QUERY PLAN SELECT * FROM forms WHERE pinId=?')
    .all(f.pin.id)
    .map((r) => r.detail);
  const mapping = timings(() => query().map(f.utils.mapFormDbToForm), 20);
  f.sqlite.exec('DROP INDEX forms_pin_id_idx');
  const scan = timings(query);
  const scanPlan = f.sqlite
    .prepare('EXPLAIN QUERY PLAN SELECT * FROM forms WHERE pinId=?')
    .all(f.pin.id)
    .map((r) => r.detail);
  assert.equal(query().length, 48 * scale);
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM forms').get().n, countForms);
  report.push({
    scale,
    pins: countPins,
    forms: countForms,
    formsInLargeHousehold: 48 * scale,
    indexed,
    summary,
    withoutIndex: scan,
    mapAndDecode: mapping,
    indexedPlan,
    scanPlan,
  });
  f.close();
}
fs.writeFileSync(
  '.expo/local-performance.json',
  JSON.stringify({ environment: 'Node/host SQLite; not Android frame timings', report }, null, 2)
);
console.log(
  JSON.stringify(
    report.map((r) => ({
      scale: r.scale,
      pins: r.pins,
      forms: r.forms,
      indexedP95Ms: +r.indexed.p95Ms.toFixed(3),
      scanP95Ms: +r.withoutIndex.p95Ms.toFixed(3),
      decodeP95Ms: +r.mapAndDecode.p95Ms.toFixed(3),
      summaryP95Ms: +r.summary.p95Ms.toFixed(3),
    })),
    null,
    2
  )
);
