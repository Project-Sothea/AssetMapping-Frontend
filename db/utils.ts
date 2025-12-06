/**
 * Database Utility Functions
 *
 * Helper functions for working with database data, particularly for handling
 * array fields that are stored as JSON strings in SQLite.
 */

import type { Form, FormDB, Pin, PinDB } from '@assetmapping/shared-types';

function toDateSafe(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Sanitize Pin for SQLite insertion
 * Handles: undefined -> null, empty strings -> null, arrays -> JSON strings, missing createdAt
 */
export function sanitizePinForDb(pin: Pin): PinDB {
  return {
    ...pin,
    createdAt: toDateSafe((pin as any).createdAt ?? new Date()),
    updatedAt: toDateSafe((pin as any).updatedAt ?? (pin as any).createdAt ?? new Date()),
    images: jsonifyArray(pin.images),
  };
}

export function mapPinDbToPin(pin: PinDB): Pin {
  return {
    ...pin,
    images: safeJsonStringParse(pin.images),
  };
}

/**
 * Sanitize Form for SQLite insertion
 * Handles: undefined -> null, empty strings -> null, arrays -> JSON strings, missing createdAt
 */
export function sanitizeFormForDb(form: Form): FormDB {
  return {
    ...form,
    createdAt: toDateSafe((form as any).createdAt ?? new Date()),
    updatedAt: toDateSafe((form as any).updatedAt ?? (form as any).createdAt ?? new Date()),
    // Health
    longTermConditions: jsonifyArray(form.longTermConditions),
    managementMethods: jsonifyArray(form.managementMethods),
    conditionDifficultyReasons: jsonifyArray(form.conditionDifficultyReasons),
    selfCareActions: jsonifyArray(form.selfCareActions),
    noToothbrushOrToothpasteReasons: jsonifyArray(form.noToothbrushOrToothpasteReasons),

    // Education
    diarrhoeaDefinition: jsonifyArray(form.diarrhoeaDefinition),
    diarrhoeaActions: jsonifyArray(form.diarrhoeaActions),
    commonColdSymptoms: jsonifyArray(form.commonColdSymptoms),
    commonColdActions: jsonifyArray(form.commonColdActions),
    mskInjuryDefinition: jsonifyArray(form.mskInjuryDefinition),
    mskInjuryActions: jsonifyArray(form.mskInjuryActions),
    hypertensionDefinition: jsonifyArray(form.hypertensionDefinition),
    hypertensionActions: jsonifyArray(form.hypertensionActions),
    unhealthyFoodReasons: jsonifyArray(form.unhealthyFoodReasons),
    highCholesterolDefinition: jsonifyArray(form.highCholesterolDefinition),
    highCholesterolActions: jsonifyArray(form.highCholesterolActions),
    diabetesDefinition: jsonifyArray(form.diabetesDefinition),
    diabetesActions: jsonifyArray(form.diabetesActions),

    // Water
    waterSources: jsonifyArray(form.waterSources),
    unsafeWaterTypes: jsonifyArray(form.unsafeWaterTypes),
    waterFilterNonUseReasons: jsonifyArray(form.waterFilterNonUseReasons),
  };
}

export function mapFormDbToForm(form: FormDB): Form {
  return {
    ...form,
    longTermConditions: safeJsonStringParse(form.longTermConditions),
    managementMethods: safeJsonStringParse(form.managementMethods),
    conditionDifficultyReasons: safeJsonStringParse(form.conditionDifficultyReasons),
    selfCareActions: safeJsonStringParse(form.selfCareActions),
    noToothbrushOrToothpasteReasons: safeJsonStringParse(form.noToothbrushOrToothpasteReasons),
    diarrhoeaDefinition: safeJsonStringParse(form.diarrhoeaDefinition),
    diarrhoeaActions: safeJsonStringParse(form.diarrhoeaActions),
    commonColdSymptoms: safeJsonStringParse(form.commonColdSymptoms),
    commonColdActions: safeJsonStringParse(form.commonColdActions),
    mskInjuryDefinition: safeJsonStringParse(form.mskInjuryDefinition),
    mskInjuryActions: safeJsonStringParse(form.mskInjuryActions),
    hypertensionDefinition: safeJsonStringParse(form.hypertensionDefinition),
    hypertensionActions: safeJsonStringParse(form.hypertensionActions),
    unhealthyFoodReasons: safeJsonStringParse(form.unhealthyFoodReasons),
    highCholesterolDefinition: safeJsonStringParse(form.highCholesterolDefinition),
    highCholesterolActions: safeJsonStringParse(form.highCholesterolActions),
    diabetesDefinition: safeJsonStringParse(form.diabetesDefinition),
    diabetesActions: safeJsonStringParse(form.diabetesActions),
    waterSources: safeJsonStringParse(form.waterSources),
    unsafeWaterTypes: safeJsonStringParse(form.unsafeWaterTypes),
    waterFilterNonUseReasons: safeJsonStringParse(form.waterFilterNonUseReasons),
  };
}
/**
 * Helper: Ensure arrays are JSON strings for SQLite
 */
function jsonifyArray(value: string[]): string {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value === undefined || value === null) return '[]';
  return typeof value === 'string' ? value : JSON.stringify([value]);
}

export function safeJsonStringParse(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
