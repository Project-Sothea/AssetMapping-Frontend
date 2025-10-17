import { Form } from '~/db/schema';
import { Result, AppError, ErrorCode } from '~/shared/types/result.types';
import { ErrorHandler } from '~/shared/utils/errorHandling';
import { FormValues, FormTransformers } from '~/shared/utils/formTransformers';
import { LocalRepository } from '../../../services/sync/repositories/LocalRepository';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service layer for Form operations
 * Encapsulates business logic for creating, reading, updating, and deleting forms
 */
export class FormService {
  constructor(private localRepo: LocalRepository<Form, any>) {}

  /**
   * Create a new form
   */
  async createForm(values: FormValues): Promise<Result<Form>> {
    try {
      // Generate ID if not provided
      const formId = values.id || uuidv4();

      // Transform form data to database schema
      const dbValues = FormTransformers.formToDb(values);

      // Prepare complete form object with sync metadata
      const formData: Partial<Form> = {
        ...dbValues,
        id: formId,
        ...FormTransformers.getCreationFields(),
      };

      await this.localRepo.create(formData as Form);

      // Fetch the created form to return
      const createdForm = await this.localRepo.get(formId);
      if (!createdForm) {
        return {
          success: false,
          error: new AppError('Form creation failed', ErrorCode.DATABASE_ERROR),
        };
      }

      return { success: true, data: createdForm };
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to create form');
      ErrorHandler.log(appError, 'FormService.createForm');
      return { success: false, error: appError };
    }
  }

  /**
   * Update an existing form
   */
  async updateForm(id: string, values: FormValues): Promise<Result<Form>> {
    try {
      // Transform form data to database schema
      const dbValues = FormTransformers.formToDb(values);

      // Prepare update object with sync metadata
      const updateData: Partial<Form> = {
        ...dbValues,
        id,
        ...FormTransformers.getSyncFields('dirty'),
      };

      await this.localRepo.update(updateData as Form);

      // Fetch the updated form to return
      const updatedForm = await this.localRepo.get(id);
      if (!updatedForm) {
        return {
          success: false,
          error: new AppError('Form update failed', ErrorCode.DATABASE_ERROR),
        };
      }

      return { success: true, data: updatedForm };
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to update form');
      ErrorHandler.log(appError, 'FormService.updateForm');
      return { success: false, error: appError };
    }
  }

  /**
   * Delete a form (soft delete)
   */
  async deleteForm(id: string): Promise<Result<void>> {
    try {
      // Soft delete: set deletedAt and mark as dirty for sync
      await this.localRepo.update({
        id,
        deletedAt: new Date().toISOString(),
        status: 'dirty',
        updatedAt: new Date().toISOString(),
      } as any);

      return { success: true, data: undefined };
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to delete form');
      ErrorHandler.log(appError, 'FormService.deleteForm');
      return { success: false, error: appError };
    }
  }

  /**
   * Get a single form by ID
   * Returns fresh data from database
   */
  async getForm(id: string): Promise<Result<Form>> {
    try {
      const form = await this.localRepo.get(id);
      if (!form) {
        return {
          success: false,
          error: new AppError('Form not found', ErrorCode.NOT_FOUND),
        };
      }
      return { success: true, data: form };
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to fetch form');
      ErrorHandler.log(appError, 'FormService.getForm');
      return { success: false, error: appError };
    }
  }

  /**
   * Get all forms for a specific pin (excludes soft-deleted)
   */
  async getFormsForPin(pinId: string): Promise<Result<Form[]>> {
    try {
      const allForms = await this.localRepo.fetchAll();
      // Filter out soft-deleted forms and filter by pinId
      const pinForms = allForms.filter((form) => form.pinId === pinId && !form.deletedAt);
      return { success: true, data: pinForms };
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to fetch forms');
      ErrorHandler.log(appError, 'FormService.getFormsForPin');
      return { success: false, error: appError };
    }
  }

  /**
   * Get all forms (excludes soft-deleted)
   */
  async getAllForms(): Promise<Result<Form[]>> {
    try {
      const allForms = await this.localRepo.fetchAll();
      // Filter out soft-deleted forms
      const activeForms = allForms.filter((form) => !form.deletedAt);
      return { success: true, data: activeForms };
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to fetch forms');
      ErrorHandler.log(appError, 'FormService.getAllForms');
      return { success: false, error: appError };
    }
  }
}
