/**
 * Form API Service
 *
 * Simplified API service for forms using versioned endpoints
 * with automatic conflict detection.
 *
 * Features:
 * - Optimistic concurrency control via version numbers
 * - Automatic conflict detection (409 responses)
 * - Simple create/update/delete operations
 * - ConflictError for user-friendly error handling
 */

import { apiClient } from '../apiClient';
import type { Form } from '../../db/types';

/**
 * Custom error for version conflicts
 */
export class ConflictError extends Error {
  constructor(
    message: string,
    public currentState?: Form,
    public currentVersion?: number
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}

interface FormApiResponse {
  success: boolean;
  data?: {
    form: Form;
    version: number;
  };
  conflict?: boolean;
  currentVersion?: number;
  currentState?: Form;
  error?: string;
}

interface CreateFormParams {
  form: Omit<
    Form,
    'id' | 'version' | 'status' | 'lastSyncedAt' | 'lastFailedSyncAt' | 'failureReason'
  >;
  userId: string;
}

interface UpdateFormParams {
  form: Form;
  userId: string;
}

interface DeleteFormParams {
  formId: string;
  version: number;
  userId: string;
}

/**
 * Create a new form
 * Backend will assign ID and version=1
 */
export async function createForm({ form, userId }: CreateFormParams): Promise<Form> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/forms`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        userId,
      }),
    }
  );

  const data: FormApiResponse = await response.json();

  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.error || 'Failed to create form');
  }

  return data.data.form;
}

/**
 * Update an existing form
 * Includes baseVersion for optimistic concurrency control
 * Throws ConflictError if form was modified by another user
 */
export async function updateForm({ form, userId }: UpdateFormParams): Promise<Form> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/forms`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        baseVersion: form.version, // Send current version for conflict detection
        userId,
      }),
    }
  );

  const data: FormApiResponse = await response.json();

  // Handle 409 Conflict
  if (response.status === 409 && data.conflict) {
    throw new ConflictError(
      'Form was modified by another user',
      data.currentState,
      data.currentVersion
    );
  }

  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.error || 'Failed to update form');
  }

  return data.data.form;
}

/**
 * Delete a form (soft delete)
 * Includes version for optimistic concurrency control
 */
export async function deleteForm({ formId, version, userId }: DeleteFormParams): Promise<void> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/forms/${formId}?userId=${userId}&version=${version}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const data: FormApiResponse = await response.json();

  // Handle 409 Conflict
  if (response.status === 409 && data.conflict) {
    throw new ConflictError(
      'Form was modified by another user',
      data.currentState,
      data.currentVersion
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete form');
  }
}

/**
 * Fetch a single form by ID
 */
export async function fetchForm(formId: string): Promise<Form> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/forms/${formId}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const data: { success: boolean; data?: Form; error?: string } = await response.json();

  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.error || 'Form not found');
  }

  return data.data;
}

/**
 * Fetch all forms
 */
export async function fetchForms(): Promise<Form[]> {
  const response = await apiClient.fetchForms();

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch forms');
  }

  return response.data as Form[];
}

/**
 * Fetch forms for a specific pin
 */
export async function fetchFormsByPin(pinId: string): Promise<Form[]> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/forms?pinId=${pinId}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const data: { success: boolean; data?: Form[]; error?: string } = await response.json();

  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch forms');
  }

  return data.data;
}
