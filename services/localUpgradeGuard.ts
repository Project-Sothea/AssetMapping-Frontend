type Inspector = { getAllSync<T>(sql: string): T[]; getFirstSync<T>(sql: string): T | null };

// Do not run the historical table-rebuild migration over unknown populated
// storage. Some old schemas lack copied columns and store timestamps as text.
export function getLocalUpgradeError(database: Inspector): Error | undefined {
  const tables = database.getAllSync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table'"
  );
  const names = new Set(tables.map((row) => row.name));
  const forms = names.has('forms')
    ? database.getAllSync<{ name: string; type: string }>('PRAGMA table_info(forms)')
    : [];
  const pins = names.has('pins')
    ? database.getAllSync<{ name: string; type: string }>('PRAGMA table_info(pins)')
    : [];
  const oldForms =
    forms.length > 0 &&
    !forms.some((column) => column.name === 'dataCollectionDate') &&
    (database.getFirstSync<{ n: number }>('SELECT count(*) n FROM forms')?.n ?? 0) > 0;
  const oldPins =
    pins.some((column) => column.name === 'createdAt' && column.type.toUpperCase() !== 'INTEGER') &&
    (database.getFirstSync<{ n: number }>('SELECT count(*) n FROM pins')?.n ?? 0) > 0;
  if (oldForms || oldPins)
    return new Error(
      'Older local survey storage needs export and review before upgrading. Its data has been preserved. Keep this app installed and contact the project team.'
    );
}
