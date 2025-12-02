/**
 * Pull Updates from Backend
 *
 * Fetches updated entities from backend and saves to local SQLite database
 */

import { db } from '~/services/drizzleDb';
import { pins, forms } from '~/db/schema';
import { apiClient } from '~/services/apiClient';
import { sanitizePinForDb, sanitizeFormForDb } from '~/db/utils';
import { eq } from 'drizzle-orm';

// --- Types ---
type EntityType = 'pin' | 'form';

interface ProcessResult {
  successCount: number;
  totalCount: number;
}

// --- Core Processing Functions ---

/**
 * Helper: Process and save a single pin to local database
 */
async function processPinData(pinData: Record<string, unknown>): Promise<void> {
  const pinId = pinData.id as string;

  // Extract filenames from backend response (may be paths like "pin/ID/file.jpg")
  const { parseImageFilenames } = await import('~/services/images/ImageManager');
  const backendImages = parseImageFilenames(pinData.images as string | string[]);
  const filenames = backendImages.map((path) => path.split('/').pop() || path);

  const sanitized = sanitizePinForDb({
    ...pinData,
    images: JSON.stringify(filenames),
  });

  await upsertEntity(pins, sanitized, pinId);
}

/**
 * Helper: Process and save a single form to local database
 */
async function processFormData(formData: Record<string, unknown>): Promise<void> {
  const sanitized = sanitizeFormForDb(formData);
  await upsertEntity(forms, sanitized, sanitized.id);
}

/**
 * Generic upsert helper - insert or update entity
 */
async function upsertEntity<T extends { id: string }>(
  table: typeof pins | typeof forms,
  data: T,
  id: string
): Promise<void> {
  const existing = await db.select().from(table).where(eq(table.id, id)).limit(1);

  if (existing.length > 0) {
    await db.update(table).set(data).where(eq(table.id, id));
  } else {
    await db.insert(table).values(data);
  }
}

/**
 * Process multiple entities with error handling
 */
async function processBatch<T extends Record<string, unknown>>(
  entityType: EntityType,
  data: T[],
  processor: (item: T) => Promise<void>
): Promise<ProcessResult> {
  let successCount = 0;

  for (const item of data) {
    try {
      await processor(item);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to process ${entityType} ${item.id}:`, error);
    }
  }

  return { successCount, totalCount: data.length };
}

/**
 * Generic fetch and process handler for multiple entities
 */
async function fetchAndProcess<T extends Record<string, unknown>>(
  entityType: EntityType,
  fetcher: () => Promise<{ success: boolean; data?: T[]; error?: string }>,
  processor: (item: T) => Promise<void>,
  operation: string
): Promise<void> {
  console.log(`🔄 ${operation}`);

  const response = await fetcher();

  if (!response.success || !response.data) {
    throw new Error(response.error || `Failed to fetch ${entityType}s`);
  }

  if (response.data.length === 0) {
    console.log(`✅ No new ${entityType} updates`);
    return;
  }

  const result = await processBatch(entityType, response.data, processor);
  console.log(
    `✅ Synced ${result.successCount}/${result.totalCount} ${entityType}s to local database`
  );
}

/**
 * Generic fetch and process handler for single entity
 */
async function fetchAndProcessSingle<T extends Record<string, unknown>>(
  entityType: EntityType,
  fetcher: () => Promise<{ success: boolean; data?: T; error?: string }>,
  processor: (item: T) => Promise<void>,
  operation: string
): Promise<void> {
  console.log(`🔄 ${operation}`);

  const response = await fetcher();

  if (!response.success || !response.data) {
    throw new Error(response.error || `Failed to fetch ${entityType}`);
  }

  await processor(response.data);
  console.log(`✅ Synced ${entityType} to local database`);
}

// --- Public API ---

/**
 * Pull a specific pin from backend and update local database
 */
export async function pullPinUpdate(pinId: string): Promise<void> {
  try {
    await fetchAndProcessSingle(
      'pin',
      () => apiClient.fetchPin(pinId),
      processPinData,
      `Pulling pin update from backend: ${pinId}`
    );
    console.log(`✅ Updated local pin: ${pinId}`);
  } catch (error) {
    console.error(`❌ Failed to pull pin update: ${error}`);
    throw error;
  }
}

/**
 * Pull a specific form from backend and update local database
 */
export async function pullFormUpdate(formId: string): Promise<void> {
  try {
    await fetchAndProcessSingle(
      'form',
      () => apiClient.fetchForm(formId),
      processFormData,
      `Pulling form update from backend: ${formId}`
    );
    console.log(`✅ Updated local form: ${formId}`);
  } catch (error) {
    console.error(`❌ Failed to pull form update: ${error}`);
    throw error;
  }
}

/**
 * Pull all pins from backend and sync to local database
 */
export async function pullAllPins(): Promise<void> {
  try {
    await fetchAndProcess(
      'pin',
      () => apiClient.fetchPins(),
      processPinData,
      'Pulling all pins from backend'
    );
  } catch (error) {
    console.error(`❌ Failed to pull all pins: ${error}`);
    throw error;
  }
}

/**
 * Pull all forms from backend and sync to local database
 */
export async function pullAllForms(): Promise<void> {
  try {
    await fetchAndProcess(
      'form',
      () => apiClient.fetchForms(),
      processFormData,
      'Pulling all forms from backend'
    );
  } catch (error) {
    console.error(`❌ Failed to pull all forms: ${error}`);
    throw error;
  }
}

/**
 * Pull pins updated since a specific timestamp (incremental sync)
 */
export async function pullPinsSince(timestamp: number): Promise<void> {
  try {
    await fetchAndProcess(
      'pin',
      () => apiClient.fetchPinsSince(timestamp),
      processPinData,
      `Pulling pins updated since ${new Date(timestamp).toISOString()}`
    );
  } catch (error) {
    console.error(`❌ Failed to pull pins since timestamp: ${error}`);
    throw error;
  }
}

/**
 * Pull forms updated since a specific timestamp (incremental sync)
 */
export async function pullFormsSince(timestamp: number): Promise<void> {
  try {
    await fetchAndProcess(
      'form',
      () => apiClient.fetchFormsSince(timestamp),
      processFormData,
      `Pulling forms updated since ${new Date(timestamp).toISOString()}`
    );
  } catch (error) {
    console.error(`❌ Failed to pull forms since timestamp: ${error}`);
    throw error;
  }
}
