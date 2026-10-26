import type { FormArrayFieldKey } from '@assetmapping/shared-types';

// Keep runtime metadata local: the shared package is a sibling type dependency
// and is not available to Metro in standalone mobile builds.
export const FORM_ARRAY_FIELDS = [
  'longTermConditions',
  'managementMethods',
  'conditionDifficultyReasons',
  'selfCareActions',
  'medicinePurchaseLocations',
  'noToothbrushOrToothpasteReasons',
  'diarrhoeaDefinition',
  'diarrhoeaActions',
  'commonColdSymptoms',
  'commonColdActions',
  'mskInjuryDefinition',
  'mskInjuryActions',
  'hypertensionDefinition',
  'hypertensionActions',
  'unhealthyFoodReasons',
  'highCholesterolDefinition',
  'highCholesterolActions',
  'diabetesDefinition',
  'diabetesActions',
  'waterSources',
  'unsafeWaterTypes',
  'waterFilterNonUseReasons',
] as const satisfies readonly FormArrayFieldKey[];
