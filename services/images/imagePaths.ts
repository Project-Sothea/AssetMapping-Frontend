/** A reference must be one literal path component, never a path or encoded path. */
export function assertSafeImageComponent(value: unknown): asserts value is string {
  if (
    typeof value !== 'string' ||
    !value ||
    value.trim() !== value ||
    value === '.' ||
    value === '..' ||
    /[/\\%:\x00-\x1f\x7f]/.test(value)
  )
    throw new Error('Unsafe image path component.');
}

export function assertSafeImageReference(pinId: unknown, filename: unknown): void {
  assertSafeImageComponent(pinId);
  assertSafeImageComponent(filename);
}
