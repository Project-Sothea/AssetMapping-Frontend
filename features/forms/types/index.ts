import { forms } from '~/db/schema';

export type FormDB = typeof forms.$inferSelect;

// Form represents the runtime application type with parsed arrays (string[])
// whereas FormDB has arrays as JSON strings for database storage
type ArrayFieldKeys =
  | 'longTermConditions'
  | 'managementMethods'
  | 'conditionDifficultyReasons'
  | 'selfCareActions'
  | 'noToothbrushOrToothpasteReasons'
  | 'diarrhoeaDefinition'
  | 'diarrhoeaActions'
  | 'commonColdSymptoms'
  | 'commonColdActions'
  | 'mskInjuryDefinition'
  | 'mskInjuryActions'
  | 'hypertensionDefinition'
  | 'hypertensionActions'
  | 'unhealthyFoodReasons'
  | 'highCholesterolDefinition'
  | 'highCholesterolActions'
  | 'diabetesDefinition'
  | 'diabetesActions'
  | 'waterSources'
  | 'unsafeWaterTypes'
  | 'waterFilterNonUseReasons';

export type Form = Omit<FormDB, ArrayFieldKeys> & {
  [K in ArrayFieldKeys]: string[];
};

export type FormValues = Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'status'>;

export type FormUpdate = Partial<Form>;
