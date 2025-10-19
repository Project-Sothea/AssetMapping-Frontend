import { apiClient } from '~/services/apiClient';
import { Form } from '~/utils/globalTypes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upsert a single form via backend API
 * Used by queue system for individual sync operations
 */
export const upsertOne = async (form: Form) => {
  try {
    // Strip out local-only fields before syncing
    const { failureReason, status, lastSyncedAt, lastFailedSyncAt, ...rest } = form;

    const formToSync = {
      ...rest,
      updatedAt: rest.updatedAt ?? new Date().toISOString(),
    };

    // Use backend API for sync
    const response = await apiClient.syncItem({
      idempotencyKey: uuidv4(),
      entityType: 'form',
      operation: rest.id ? 'update' : 'create',
      payload: formToSync,
      deviceId: 'mobile-app', // TODO: Get actual device ID
      timestamp: new Date().toISOString(),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to sync form');
    }
  } catch (e) {
    console.error('Failed to upsert form:', e);
    throw new Error('Error upserting form via backend API');
  }
};

/**
 * Soft delete a form via backend API
 * Sets deletedAt timestamp instead of removing the record
 * Used by queue system for delete operations
 */
export const deleteForm = async (formId: string) => {
  try {
    const response = await apiClient.syncItem({
      idempotencyKey: uuidv4(),
      entityType: 'form',
      operation: 'delete',
      payload: { id: formId },
      deviceId: 'mobile-app', // TODO: Get actual device ID
      timestamp: new Date().toISOString(),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete form');
    }
  } catch (e) {
    console.error('Failed to soft delete form:', e);
    throw new Error('Error soft deleting form via backend API');
  }
};
