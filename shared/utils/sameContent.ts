// Compare the editable data the worker actually saw. A metadata-only upload
// acknowledgement may advance version without invalidating that edit session.
const metadata = new Set(['id', 'createdAt', 'updatedAt', 'version', 'status']);
export function sameContent(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (metadata.has(key)) continue;
    if (JSON.stringify(a[key] ?? null) !== JSON.stringify(b[key] ?? null)) return false;
  }
  return true;
}
