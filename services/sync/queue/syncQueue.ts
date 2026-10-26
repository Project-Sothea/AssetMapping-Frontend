/** Explicit manual upload sessions, retry recovery and queue metrics. */
import { eq, asc, count, inArray } from 'drizzle-orm';

import { syncQueue, syncInflight } from '~/db/schema';
import { db } from '~/services/drizzleDb';
import {
  cleanupCompletedPinImages,
  cleanupDeletedPinImages,
} from '~/services/images/deletedPinImages';

import { runTransfer } from '../transferCoordinator';

import {
  processOperation,
  markCompleted,
  handleError,
  stageOperation,
  pendingInflight,
  hasInflight,
} from './queueOperations';
import type { QueueMetrics, UploadResult } from './types';

class BlockedUploadError extends Error {}

export async function getQueueMetrics(): Promise<QueueMetrics> {
  const queue = db
    .select({ id: syncQueue.id, status: syncQueue.status })
    .from(syncQueue)
    .where(inArray(syncQueue.status, ['pending', 'failed']))
    .all();
  const inflight = db
    .select({ id: syncInflight.queueId, status: syncInflight.status })
    .from(syncInflight)
    .all();
  const failed = new Set(
    [...queue, ...inflight].filter((item) => item.status === 'failed').map((item) => item.id)
  );
  const pending = new Set(
    [...queue, ...inflight]
      .filter((item) => item.status === 'pending' && !failed.has(item.id))
      .map((item) => item.id)
  );
  const completed =
    db.select({ n: count() }).from(syncQueue).where(eq(syncQueue.status, 'completed')).get()?.n ??
    0;
  return { pending: pending.size, failed: failed.size, completed };
}

async function retryFailed(): Promise<void> {
  db.transaction((tx) => {
    tx.update(syncQueue)
      .set({ status: 'pending', attempts: 0, lastError: null })
      .where(eq(syncQueue.status, 'failed'))
      .run();
    for (const row of tx
      .select()
      .from(syncInflight)
      .where(eq(syncInflight.status, 'failed'))
      .all()) {
      const op = JSON.parse(row.operation);
      tx.update(syncInflight)
        .set({
          status: 'pending',
          operation: JSON.stringify({ ...op, attempts: 0, status: 'pending', lastError: null }),
        })
        .where(eq(syncInflight.key, row.key))
        .run();
    }
  });
}

function operationRank(op: Parameters<typeof processOperation>[0]) {
  return op.operation === 'delete'
    ? op.entityType === 'form'
      ? 2
      : 3
    : op.entityType === 'pin'
      ? 0
      : 1;
}
/** All network writes from the UI occur inside this explicit manual transfer. */
export async function uploadPendingChanges(
  onProgress?: (done: number, total: number) => void
): Promise<UploadResult> {
  return runTransfer('upload', async () => {
    await cleanupCompletedPinImages();
    await retryFailed();
    const replay = pendingInflight().sort((a, b) => operationRank(a) - operationRank(b));
    const replayKeys = new Set(replay.map((op) => op.idempotencyKey));
    const latest = db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.status, 'pending'))
      .orderBy(asc(syncQueue.sequenceNumber))
      .all()
      .filter((op) => !replayKeys.has(op.idempotencyKey))
      .sort((a, b) => operationRank(a) - operationRank(b));
    const result: UploadResult = { uploaded: 0, failed: 0, blocked: 0, remaining: 0, errors: [] };
    const failedPins = new Set<string>();
    const snapshot = [...replay, ...latest];
    onProgress?.(0, snapshot.length);
    for (const [index, original] of snapshot.entries()) {
      const staged = replayKeys.has(original.idempotencyKey);
      const op = staged
        ? original
        : db.select().from(syncQueue).where(eq(syncQueue.id, original.id)).get();
      if (!op || op.status !== 'pending') continue;
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(op.payload);
        if (
          (op.entityType === 'form' && failedPins.has(String(payload.pinId))) ||
          (!staged && hasInflight(op.entityType, op.entityId))
        ) {
          result.blocked++;
          throw new BlockedUploadError(
            'An earlier revision or parent pin needs review before uploading this change.'
          );
        }
        stageOperation(op);
        const acknowledged = await processOperation(op);
        markCompleted(op, acknowledged);
        if (op.entityType === 'pin' && op.operation === 'delete')
          await cleanupDeletedPinImages(op.entityId);
        result.uploaded++;
      } catch (error) {
        const failure = error instanceof Error ? error : new Error(String(error));
        if (op.entityType === 'pin') failedPins.add(op.entityId);
        if (failure instanceof BlockedUploadError) {
          db.update(syncQueue)
            .set({ lastError: failure.message })
            .where(eq(syncQueue.id, op.id))
            .run();
        } else {
          await handleError(op, failure);
          result.failed++;
        }
        result.errors.push({
          entityId: op.entityId,
          entityType: op.entityType,
          name: String(payload.name || op.entityId),
          message: failure.message,
        });
      }
      onProgress?.(index + 1, snapshot.length);
    }
    const metrics = await getQueueMetrics();
    result.remaining = metrics.pending + metrics.failed;
    return result;
  });
}
