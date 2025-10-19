// ==================== Private State ====================

let isProcessing = false;
let processingTimer: ReturnType<typeof setTimeout> | null = null;

export function getIsProcessing(): boolean {
  return isProcessing;
}

export function setIsProcessing(value: boolean): void {
  isProcessing = value;
}

export function scheduleNextProcess(processQueue: () => Promise<void>): void {
  if (processingTimer) clearTimeout(processingTimer);
  processingTimer = setTimeout(() => processQueue(), 2000);
}
