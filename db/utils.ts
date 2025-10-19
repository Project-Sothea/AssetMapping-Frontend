/**
 * Database Utility Functions
 *
 * Helper functions for working with database data, particularly for handling
 * array fields that are stored as JSON strings in SQLite.
 */

/**
 * Convert array fields to JSON strings for SQLite storage.
 * SQLite doesn't support native array types, so we store arrays as JSON strings.
 *
 * @param value - Object with potential array fields
 * @returns Object with arrays converted to JSON strings
 *
 * @example
 * stringifyArrayFields({ tags: ['a', 'b'], name: 'test' })
 * // Returns: { tags: '["a","b"]', name: 'test' }
 */
export function stringifyArrayFields(value: any): typeof value {
  const result = { ...value };
  for (const key in result) {
    if (Array.isArray(result[key])) {
      result[key] = JSON.stringify(result[key]);
    }
  }
  return result;
}

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
  const result = { ...value };
  for (const key in result) {
    if (typeof result[key] === 'string') {
      try {
        const parsed = JSON.parse(result[key]);
        if (Array.isArray(parsed)) {
          result[key] = parsed;
        }
      } catch {
        // Not a JSON array string, leave as is
      }
    }
  }
  return result;
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
const nullIfEmpty = (val: any) => (val === '' ? null : (val ?? null));

/**
 * Helper: Ensure arrays are JSON strings for SQLite
 */
const jsonifyArray = (val: any) => {
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'string') return val;
  return null;
};

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
export function sanitizeFormForDb(form: any): any {
  return {
    id: form.id,
    createdAt: form.createdAt ?? new Date().toISOString(),
    updatedAt: form.updatedAt ?? null,
    deletedAt: form.deletedAt ?? null,
    version: form.version ?? 1,
    pinId: nullIfEmpty(form.pinId),
    villageId: nullIfEmpty(form.villageId),
    village: nullIfEmpty(form.village),

    // Text fields
    brushTeeth: nullIfEmpty(form.brushTeeth),
    canAttend: nullIfEmpty(form.canAttend),
    cholesterol: nullIfEmpty(form.cholesterol),
    coldLookLike: nullIfEmpty(form.coldLookLike),
    conditionDetails: nullIfEmpty(form.conditionDetails),
    diabetes: nullIfEmpty(form.diabetes),
    diarrhoea: nullIfEmpty(form.diarrhoea),
    diarrhoeaAction: nullIfEmpty(form.diarrhoeaAction),
    eatCleanFood: nullIfEmpty(form.eatCleanFood),
    handAfterToilet: nullIfEmpty(form.handAfterToilet),
    handBeforeMeal: nullIfEmpty(form.handBeforeMeal),
    haveToothbrush: nullIfEmpty(form.haveToothbrush),
    hypertension: nullIfEmpty(form.hypertension),
    knowDoctor: nullIfEmpty(form.knowDoctor),
    knowWaterFilters: nullIfEmpty(form.knowWaterFilters),
    mskInjury: nullIfEmpty(form.mskInjury),
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
    whereBuyMedicine: nullIfEmpty(form.whereBuyMedicine),

    // Array fields (stored as JSON strings)
    cholesterolAction: jsonifyArray(form.cholesterolAction),
    coldAction: jsonifyArray(form.coldAction),
    diabetesAction: jsonifyArray(form.diabetesAction),
    hypertensionAction: jsonifyArray(form.hypertensionAction),
    longTermConditions: jsonifyArray(form.longTermConditions),
    managementMethods: jsonifyArray(form.managementMethods),
    mskAction: jsonifyArray(form.mskAction),
    notUsingWaterFilter: jsonifyArray(form.notUsingWaterFilter),
    unsafeWater: jsonifyArray(form.unsafeWater),
    waterSources: jsonifyArray(form.waterSources),
    whatDoWhenSick: jsonifyArray(form.whatDoWhenSick),

    // Sync tracking fields
    status: nullIfEmpty(form.status),
    failureReason: nullIfEmpty(form.failureReason),
    lastSyncedAt: form.lastSyncedAt ?? null,
    lastFailedSyncAt: form.lastFailedSyncAt ?? null,
  };
}
