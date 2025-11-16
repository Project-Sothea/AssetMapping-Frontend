/**
 * Database Utility Functions
 *
 * Helper functions for working with database data, particularly for handling
 * array fields that are stored as JSON strings in SQLite.
 */

import { parseArrayFields as sharedParseArrayFields } from '~/shared/utils/parsing';
import type { Form } from './types';

/**
 * Parse JSON string arrays back to arrays when reading from SQLite.
 *
 * @param value - Object with potential JSON string fields
 * @returns Object with JSON strings parsed back to arrays
 *
 * @example
 * parseArrayFields({ tags: '["a","b"]', name: 'test' })
 * // Returns: { tags: ['a', 'b'], name: 'test' }
 */
export function parseArrayFields(value: any): typeof value {
  return sharedParseArrayFields(value);
}

/**
 * Sanitize data for SQLite - remove undefined values and convert Dates
 */
export function sanitizeForDb(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(sanitizeForDb);

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      sanitized[key] = sanitizeForDb(value);
    }
  }
  return sanitized;
}

/**
 * Helper: Convert empty strings to null
 */
const nullIfEmpty = (v: any) => (v === undefined || v === '' ? null : v);

/**
 * Helper: Ensure arrays are JSON strings for SQLite
 */
function jsonifyArray(value: any) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value === undefined || value === null) return '[]';
  return typeof value === 'string' ? value : JSON.stringify([value]);
}

/**
 * Sanitize Pin for SQLite insertion
 * Handles: undefined -> null, empty strings -> null, arrays -> JSON strings, missing createdAt
 */
export function sanitizePinForDb(pin: any): any {
  return {
    id: pin.id,
    createdAt: pin.createdAt ?? new Date().toISOString(),
    updatedAt: pin.updatedAt ?? null,
    deletedAt: pin.deletedAt ?? null,
    version: pin.version ?? 1,
    lat: pin.lat,
    lng: pin.lng,
    type: nullIfEmpty(pin.type),
    name: nullIfEmpty(pin.name),
    address: nullIfEmpty(pin.address),
    cityVillage: nullIfEmpty(pin.cityVillage),
    description: nullIfEmpty(pin.description),
    images: jsonifyArray(pin.images),
    localImages: jsonifyArray(pin.localImages),
    status: nullIfEmpty(pin.status),
    failureReason: nullIfEmpty(pin.failureReason),
    lastSyncedAt: pin.lastSyncedAt ?? null,
    lastFailedSyncAt: pin.lastFailedSyncAt ?? null,
  };
}

/**
 * Sanitize Form for SQLite insertion
 * Handles: undefined -> null, empty strings -> null, arrays -> JSON strings, missing createdAt
 */
export function sanitizeFormForDb(form: Form): any {
  return {
    id: form.id,
    createdAt: form.createdAt ?? new Date().toISOString(),
    updatedAt: form.updatedAt ?? null,
    deletedAt: form.deletedAt ?? null,
    version: form.version ?? 1,
    pinId: nullIfEmpty(form.pinId),
    villageId: nullIfEmpty(form.villageId),
    name: nullIfEmpty(form.name),
    village: nullIfEmpty(form.village),

    // Text fields
    brushTeeth: nullIfEmpty(form.brushTeeth),
    canAttend: nullIfEmpty(form.canAttend),
    conditionDetails: nullIfEmpty(form.conditionDetails),
    eatCleanFood: nullIfEmpty(form.eatCleanFood),
    handAfterToilet: nullIfEmpty(form.handAfterToilet),
    handBeforeMeal: nullIfEmpty(form.handBeforeMeal),
    haveToothbrush: nullIfEmpty(form.haveToothbrush),
    knowDoctor: nullIfEmpty(form.knowDoctor),
    knowWaterFilters: nullIfEmpty(form.knowWaterFilters),
    otherBrushTeeth: nullIfEmpty(form.otherBrushTeeth),
    otherBuyMedicine: nullIfEmpty(form.otherBuyMedicine),
    otherCondition: nullIfEmpty(form.otherCondition),
    otherLearning: nullIfEmpty(form.otherLearning),
    otherManagement: nullIfEmpty(form.otherManagement),
    otherSickAction: nullIfEmpty(form.otherSickAction),
    otherWaterFilterReason: nullIfEmpty(form.otherWaterFilterReason),
    otherWaterSource: nullIfEmpty(form.otherWaterSource),
    ownTransport: nullIfEmpty(form.ownTransport),
    povertyCard: nullIfEmpty(form.povertyCard),

    // Array fields (stored as JSON strings)
    cholesterol: jsonifyArray(form.cholesterol),
    cholesterolAction: jsonifyArray(form.cholesterolAction),
    coldAction: jsonifyArray(form.coldAction),
    coldLookLike: jsonifyArray(form.coldLookLike),
    diabetes: jsonifyArray(form.diabetes),
    diabetesAction: jsonifyArray(form.diabetesAction),
    diarrhoea: jsonifyArray(form.diarrhoea),
    diarrhoeaAction: jsonifyArray(form.diarrhoeaAction),
    hypertension: jsonifyArray(form.hypertension),
    hypertensionAction: jsonifyArray(form.hypertensionAction),
    mskAction: jsonifyArray(form.mskAction),
    mskInjury: jsonifyArray(form.mskInjury),
    longTermConditions: jsonifyArray(form.longTermConditions),
    managementMethods: jsonifyArray(form.managementMethods),
    notUsingWaterFilter: jsonifyArray(form.notUsingWaterFilter),
    unsafeWater: jsonifyArray(form.unsafeWater),
    waterSources: jsonifyArray(form.waterSources),
    whatDoWhenSick: jsonifyArray(form.whatDoWhenSick),
    whereBuyMedicine: jsonifyArray(form.whereBuyMedicine), // ← include if multi-select

    // Sync tracking fields
    status: nullIfEmpty(form.status),
    failureReason: nullIfEmpty(form.failureReason),
    lastSyncedAt: form.lastSyncedAt ?? null,
    lastFailedSyncAt: form.lastFailedSyncAt ?? null,
  };
}
