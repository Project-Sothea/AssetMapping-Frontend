/** Keep this runtime module self-contained for standalone mobile builds. */
export const VILLAGES = [
  'Krang Svat',
  'Srae Ou',
  'Svay Sor',
  'Boeung Tim',
  'Test Village',
] as const;

export function assertPinVillage(value: unknown, allowBlank = false): void {
  if (allowBlank && (value == null || value === '')) return;
  if (typeof value !== 'string' || !(VILLAGES as readonly string[]).includes(value)) {
    throw new Error('Choose a village from the dropdown before saving this pin.');
  }
}
