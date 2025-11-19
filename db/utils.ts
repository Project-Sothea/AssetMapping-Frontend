/**
 * Database Utility Functions
 *
 * Helper functions for working with database data, particularly for handling
 * array fields that are stored as JSON strings in SQLite.
 */

import type { Pin, Form, FormDB } from '~/db/schema';

/**
 * Sanitize data for SQLite - remove undefined values and convert Dates
 */
export function sanitizeForDb(obj: unknown): unknown {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(sanitizeForDb);

  const sanitized: Record<string, unknown> = {};
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
const nullIfEmpty = (v: unknown): string | null =>
  v === undefined || v === '' ? null : (v as string);

/**
 * Helper: Ensure arrays are JSON strings for SQLite
 */
function jsonifyArray(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value === undefined || value === null) return '[]';
  return typeof value === 'string' ? value : JSON.stringify([value]);
}

/**
 * Sanitize Pin for SQLite insertion
 * Handles: undefined -> null, empty strings -> null, arrays -> JSON strings, missing createdAt
 */
export function sanitizePinForDb(
  pin: Partial<Pin> & Record<string, unknown>
): Omit<Pin, 'id'> & { id: string } {
  return {
    id: pin.id as string,
    createdAt: pin.createdAt ?? new Date().toISOString(),
    updatedAt: pin.updatedAt ?? null,
    deletedAt: pin.deletedAt ?? null,
    version: pin.version ?? 1,
    lat: pin.lat ?? null,
    lng: pin.lng ?? null,
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
export function sanitizeFormForDb(form: Partial<Form> & Record<string, unknown>): FormDB {
  return {
    // Metadata
    id: form.id as string,
    createdAt: form.createdAt ?? new Date().toISOString(),
    updatedAt: form.updatedAt ?? null,
    deletedAt: form.deletedAt ?? null,
    version: form.version ?? 1,
    pinId: nullIfEmpty(form.pinId),

    // General
    formName: nullIfEmpty(form.formName),
    villageId: nullIfEmpty(form.villageId),
    name: nullIfEmpty(form.name),
    gender: nullIfEmpty(form.gender),
    age: form.age ?? null,
    village: nullIfEmpty(form.village),
    canAttendHealthScreening: form.canAttendHealthScreening ?? null,

    // Health
    longTermConditions: jsonifyArray(form.longTermConditions),
    otherLongTermConditions: nullIfEmpty(form.otherLongTermConditions),
    managementMethods: jsonifyArray(form.managementMethods),
    otherManagementMethods: nullIfEmpty(form.otherManagementMethods),
    conditionDifficultyReasons: jsonifyArray(form.conditionDifficultyReasons),
    otherConditionDifficultyReasons: nullIfEmpty(form.otherConditionDifficultyReasons),
    selfCareActions: jsonifyArray(form.selfCareActions),
    otherSelfCareActions: nullIfEmpty(form.otherSelfCareActions),
    knowWhereToFindDoctor: nullIfEmpty(form.knowWhereToFindDoctor),
    otherKnowWhereToFindDoctor: nullIfEmpty(form.otherKnowWhereToFindDoctor),
    transportToClinic: nullIfEmpty(form.transportToClinic),
    otherTransportToClinic: nullIfEmpty(form.otherTransportToClinic),
    medicinePurchaseLocations: nullIfEmpty(form.medicinePurchaseLocations),
    otherMedicinePurchaseLocations: nullIfEmpty(form.otherMedicinePurchaseLocations),
    povertyCardSchemeAwareness: nullIfEmpty(form.povertyCardSchemeAwareness),
    otherPovertyCardSchemeAwareness: nullIfEmpty(form.otherPovertyCardSchemeAwareness),
    povertyCardNonUseReasons: nullIfEmpty(form.povertyCardNonUseReasons),
    toothBrushingFrequency: nullIfEmpty(form.toothBrushingFrequency),
    otherToothBrushingFrequency: nullIfEmpty(form.otherToothBrushingFrequency),
    toothbrushAndToothpasteSource: nullIfEmpty(form.toothbrushAndToothpasteSource),
    noToothbrushOrToothpasteReasons: jsonifyArray(form.noToothbrushOrToothpasteReasons),
    otherNoToothbrushOrToothpasteReasons: nullIfEmpty(form.otherNoToothbrushOrToothpasteReasons),

    // Education
    diarrhoeaDefinition: nullIfEmpty(form.diarrhoeaDefinition),
    otherDiarrhoeaDefinition: nullIfEmpty(form.otherDiarrhoeaDefinition),
    diarrhoeaActions: jsonifyArray(form.diarrhoeaActions),
    otherDiarrhoeaActions: nullIfEmpty(form.otherDiarrhoeaActions),
    commonColdSymptoms: nullIfEmpty(form.commonColdSymptoms),
    otherCommonColdSymptoms: nullIfEmpty(form.otherCommonColdSymptoms),
    commonColdActions: jsonifyArray(form.commonColdActions),
    otherCommonColdActions: nullIfEmpty(form.otherCommonColdActions),
    mskInjuryDefinition: nullIfEmpty(form.mskInjuryDefinition),
    otherMskInjuryDefinition: nullIfEmpty(form.otherMskInjuryDefinition),
    mskInjuryActions: jsonifyArray(form.mskInjuryActions),
    otherMskInjuryActions: nullIfEmpty(form.otherMskInjuryActions),
    hypertensionDefinition: nullIfEmpty(form.hypertensionDefinition),
    otherHypertensionDefinition: nullIfEmpty(form.otherHypertensionDefinition),
    hypertensionActions: jsonifyArray(form.hypertensionActions),
    otherHypertensionActions: nullIfEmpty(form.otherHypertensionActions),
    healthyFoodFrequency: nullIfEmpty(form.healthyFoodFrequency),
    otherHealthyFoodFrequency: nullIfEmpty(form.otherHealthyFoodFrequency),
    unhealthyFoodReasons: jsonifyArray(form.unhealthyFoodReasons),
    otherUnhealthyFoodReasons: nullIfEmpty(form.otherUnhealthyFoodReasons),
    highCholesterolDefinition: nullIfEmpty(form.highCholesterolDefinition),
    otherHighCholesterolDefinition: nullIfEmpty(form.otherHighCholesterolDefinition),
    highCholesterolActions: jsonifyArray(form.highCholesterolActions),
    otherHighCholesterolActions: nullIfEmpty(form.otherHighCholesterolActions),
    diabetesDefinition: nullIfEmpty(form.diabetesDefinition),
    otherDiabetesDefinition: nullIfEmpty(form.otherDiabetesDefinition),
    diabetesActions: jsonifyArray(form.diabetesActions),
    otherDiabetesActions: nullIfEmpty(form.otherDiabetesActions),
    otherLearningAreas: nullIfEmpty(form.otherLearningAreas),

    // Water
    waterSources: jsonifyArray(form.waterSources),
    otherWaterSources: nullIfEmpty(form.otherWaterSources),
    unsafeWaterTypes: jsonifyArray(form.unsafeWaterTypes),
    otherUnsafeWaterTypes: nullIfEmpty(form.otherUnsafeWaterTypes),
    waterFilterAwareness: nullIfEmpty(form.waterFilterAwareness),
    otherWaterFilterAwareness: nullIfEmpty(form.otherWaterFilterAwareness),
    waterFilterNonUseReasons: jsonifyArray(form.waterFilterNonUseReasons),
    otherWaterFilterNonUseReasons: nullIfEmpty(form.otherWaterFilterNonUseReasons),
    handwashingAfterToilet: nullIfEmpty(form.handwashingAfterToilet),
    otherHandwashingAfterToilet: nullIfEmpty(form.otherHandwashingAfterToilet),

    // Sync tracking fields
    status: nullIfEmpty(form.status),
    failureReason: nullIfEmpty(form.failureReason),
    lastSyncedAt: form.lastSyncedAt ?? null,
    lastFailedSyncAt: form.lastFailedSyncAt ?? null,
  };
}
