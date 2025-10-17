import { Form } from '~/db/schema';
import { ReForm } from '~/utils/globalTypes';
import { convertKeysToCamel, convertKeysToSnake, parseArrayFields } from '~/utils/dataShapes';

/**
 * Form values for form creation/editing (UI layer)
 * Using the same shape as Form but with parsed arrays
 */
export type FormValues = Omit<
  Form,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
  | 'status'
  | 'lastSyncedAt'
  | 'lastFailedSyncAt'
  | 'failureReason'
> & {
  id?: string;
};

/**
 * Centralized transformations for Form data
 */
export class FormTransformers {
  /**
   * Convert form values to database schema
   * Arrays need to be stringified for SQLite
   */
  static formToDb(formValues: FormValues): Partial<Form> {
    // Array fields are already stringified by Formik/Form component
    return formValues as Partial<Form>;
  }

  /**
   * Convert database values to form values
   * Parse array fields from JSON strings
   */
  static dbToForm(form: Form): FormValues {
    return parseArrayFields(form) as FormValues;
  }

  /**
   * Convert local Form to remote ReForm (snake_case)
   */
  static localToRemote(form: Form): ReForm {
    return convertKeysToSnake(form) as ReForm;
  }

  /**
   * Convert remote ReForm to local Form (camelCase)
   */
  static remoteToLocal(reForm: ReForm): Form {
    return convertKeysToCamel(reForm) as Form;
  }

  /**
   * Generate sync metadata fields
   */
  static getSyncFields(status: 'dirty' | 'synced') {
    const now = new Date().toISOString();
    return {
      updatedAt: now,
      status,
      lastSyncedAt: status === 'synced' ? now : null,
      lastFailedSyncAt: null,
      failureReason: null,
    };
  }

  /**
   * Generate creation metadata fields
   */
  static getCreationFields() {
    const now = new Date().toISOString();
    return {
      createdAt: now,
      updatedAt: now,
      status: 'dirty' as const,
      lastSyncedAt: null,
      deletedAt: null,
      lastFailedSyncAt: null,
      failureReason: null,
    };
  }
}
