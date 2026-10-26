// Compare persisted values, including all response fields, rather than trusting version alone.
// SQLite timestamp columns store whole seconds; undefined SQL values are stored as NULL.
export function sameStoredRow(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): boolean {
  const normalize = (value: unknown) =>
    value instanceof Date ? Math.floor(value.getTime() / 1000) : (value ?? null);
  return Object.keys(existing).every(
    (key) => normalize(existing[key]) === normalize(incoming[key])
  );
}
