import { Form, ReForm } from '~/utils/globalTypes';
import { parseArrayFields } from '~/db/utils';

/**
 * Form values for form creation/editing (UI layer)
 * Using the same shape as Form but with parsed arrays and without metadata fields
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
 *
 * Migration Status:
 * - PostgreSQL (remote): Uses camelCase (after migration)
 * - SQLite (local): Uses snake_case (until migration applied)
 */
export class FormTransformers {
  /**
   * Convert form values to database schema
   * Arrays need to be stringified for SQLite
   */
  static formValuesToDb(formValues: FormValues): Partial<Form> {
    // Array fields are already stringified by Formik/Form component
    return formValues as Partial<Form>;
  }

  /**
   * Convert database values to form values
   * Parse array fields from JSON strings
   */
  static dbToFormValues(form: Form): FormValues {
    return parseArrayFields(form) as FormValues;
  }

  /**
   * Convert local Form to remote ReForm.
   * After schema unification, TypeScript types already use camelCase - just remove local-only fields.
   */
  static localToRemote(form: Form): ReForm {
    const { failureReason, status, lastSyncedAt, lastFailedSyncAt, ...remoteForm } = form;
    return remoteForm as ReForm;
  }

  /**
   * Convert remote ReForm to local Form.
   * After schema unification, TypeScript types already use camelCase - just add local-only fields.
   */
  static remoteToLocal(reForm: ReForm): Form {
    return {
      ...reForm,
      // Add local-only fields
      failureReason: null,
      status: 'synced',
      lastSyncedAt: new Date().toISOString(),
      lastFailedSyncAt: null,
    } as Form;
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
