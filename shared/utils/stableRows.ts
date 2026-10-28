// Preserve row identity when another row changes, so React.memo can skip cards.
export function stableRows<T>(previous: T[], next: T[]): T[] {
  const key = (row: T, index: number) => (row as Record<string, unknown>).id ?? index;
  const old = new Map(previous.map((row, index) => [key(row, index), row]));
  const result = next.map((row, index) => {
    const before = old.get(key(row, index));
    if (!before) return row;
    const a = before as Record<string, unknown>,
      b = row as Record<string, unknown>;
    if (Object.keys(a).length !== Object.keys(b).length) return row;
    const unchanged = Object.keys(b).every((field) => {
      const x = a[field],
        y = b[field];
      return x instanceof Date && y instanceof Date ? x.getTime() === y.getTime() : Object.is(x, y);
    });
    return unchanged ? before : row;
  });
  return previous.length === result.length && result.every((row, index) => row === previous[index])
    ? previous
    : result;
}
