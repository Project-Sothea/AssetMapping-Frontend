// Kept for compatibility with local service callers; uploads are explicitly manual.
export function scheduleNextProcess(_processQueue: () => Promise<unknown>): void {}
