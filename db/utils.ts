/**
 * Database Utility Functions
 *
 * Helper functions for working with database data, particularly for handling
 * array fields that are stored as JSON strings in SQLite.
 */

import type { Pin, PinDB } from '~/features/pins/types/';
import type { Form, FormDB } from '~/features/forms/types/';
import { parseImageFilenames } from '~/services/images/ImageManager';

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
 * Sanitize Pin for SQLite insertion
 * Handles: undefined -> null, empty strings -> null, arrays -> JSON strings, missing createdAt
 */
export function sanitizePinForDb(pin: Pin): PinDB & { id: string } {
  return {
    ...pin,
    images: jsonifyArray(pin.images),
  };
}

export function mapPinDbToPin(pin: PinDB): Pin {
  return {
    ...pin,
    images: parseImageFilenames(pin.images),
  };
}

/**
 * Sanitize Form for SQLite insertion
 * Handles: undefined -> null, empty strings -> null, arrays -> JSON strings, missing createdAt
 */
export function sanitizeFormForDb(form: Form): FormDB {
  return {
    ...form,
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
    longTermConditions: JSON.parse(form.longTermConditions || '[]'),
    managementMethods: JSON.parse(form.managementMethods || '[]'),
    conditionDifficultyReasons: JSON.parse(form.conditionDifficultyReasons || '[]'),
    selfCareActions: JSON.parse(form.selfCareActions || '[]'),
    noToothbrushOrToothpasteReasons: JSON.parse(form.noToothbrushOrToothpasteReasons || '[]'),
    diarrhoeaDefinition: JSON.parse(form.diarrhoeaDefinition || '[]'),
    diarrhoeaActions: JSON.parse(form.diarrhoeaActions || '[]'),
    commonColdSymptoms: JSON.parse(form.commonColdSymptoms || '[]'),
    commonColdActions: JSON.parse(form.commonColdActions || '[]'),
    mskInjuryDefinition: JSON.parse(form.mskInjuryDefinition || '[]'),
    mskInjuryActions: JSON.parse(form.mskInjuryActions || '[]'),
    hypertensionDefinition: JSON.parse(form.hypertensionDefinition || '[]'),
    hypertensionActions: JSON.parse(form.hypertensionActions || '[]'),
    unhealthyFoodReasons: JSON.parse(form.unhealthyFoodReasons || '[]'),
    highCholesterolDefinition: JSON.parse(form.highCholesterolDefinition || '[]'),
    highCholesterolActions: JSON.parse(form.highCholesterolActions || '[]'),
    diabetesDefinition: JSON.parse(form.diabetesDefinition || '[]'),
    diabetesActions: JSON.parse(form.diabetesActions || '[]'),
    waterSources: JSON.parse(form.waterSources || '[]'),
    unsafeWaterTypes: JSON.parse(form.unsafeWaterTypes || '[]'),
    waterFilterNonUseReasons: JSON.parse(form.waterFilterNonUseReasons || '[]'),
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
