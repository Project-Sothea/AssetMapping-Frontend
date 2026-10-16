import { asc, eq } from 'drizzle-orm';

import { syncQueue } from '~/db/schema';
import { db } from '~/services/drizzleDb';

import { runTransfer } from '../transferCoordinator';

import {
  processOperation,
  markCompleted,
  handleError,
  outstanding,
  QueueRow,
} from './queueOperations';
import type { QueueMetrics, UploadResult } from './types';

export async function getQueueMetrics(): Promise<QueueMetrics> {
  const items = db.select().from(syncQueue).all();
  return {
    pending: items.filter((i) => i.status === 'pending').length,
    failed: items.filter((i) => i.status === 'failed').length,
    completed: items.filter((i) => i.status === 'completed').length,
  };
}

function rank(op: QueueRow) {
  if (op.operation === 'delete') return op.entityType === 'form' ? 2 : 3;
  return op.entityType === 'pin' ? 0 : 1;
}

export async function uploadPendingChanges(
  onProgress?: (done: number, total: number) => void
): Promise<UploadResult> {
  return runTransfer('upload', async () => {
    const snapshot = db
      .select()
      .from(syncQueue)
      .where(outstanding)
      .orderBy(asc(syncQueue.sequenceNumber))
      .all()
      .sort((a, b) => rank(a) - rank(b));
    const result: UploadResult = { uploaded: 0, failed: 0, blocked: 0, remaining: 0, errors: [] };
    const failedPins = new Set<string>();
    onProgress?.(0, snapshot.length);
    for (const [index, op] of snapshot.entries()) {
      try {
        const payload = JSON.parse(op.payload);
        if (op.entityType === 'form' && failedPins.has(payload.pinId)) {
          result.blocked++;
          const message = 'Parent pin failed to upload. Retry after resolving its error.';
          db.update(syncQueue).set({ lastError: message }).where(eq(syncQueue.id, op.id)).run();
          result.errors.push({
            entityId: op.entityId,
            entityType: op.entityType,
            name: payload.name || op.entityId,
            message,
          });
        } else {
          // Persist before sending: a killed app cannot know whether Apple/Android
          // stopped us before or after the backend committed the request.
          db.update(syncQueue)
            .set({ attempts: op.attempts + 1, lastAttemptAt: new Date().toISOString() })
            .where(eq(syncQueue.id, op.id))
            .run();
          await processOperation(op);
          await markCompleted(op.id);
          result.uploaded++;
        }
      } catch (error) {
        const failure = error instanceof Error ? error : new Error(String(error));
        await handleError(op, failure);
        if (op.entityType === 'pin') failedPins.add(op.entityId);
        result.failed++;
        let name = op.entityId;
        try {
          name = JSON.parse(op.payload).name || name;
        } catch {
          /* Keep the record ID for malformed payloads. */
        }
        result.errors.push({
          entityId: op.entityId,
          entityType: op.entityType,
          name,
          message: failure.message,
        });
      }
      onProgress?.(index + 1, snapshot.length);
    }
    result.remaining = db.select().from(syncQueue).where(outstanding).all().length;
    return result;
  });
}
