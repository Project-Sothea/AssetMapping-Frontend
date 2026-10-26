let processingTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleNextProcess(processQueue: () => Promise<void>): void {
  if (processingTimer) clearTimeout(processingTimer);
  processingTimer = setTimeout(() => {
    processingTimer = null;
    processQueue().catch(() => console.warn('Unable to process the local sync queue.'));
  }, 2000);
}
