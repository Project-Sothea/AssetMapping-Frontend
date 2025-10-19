/**
 * useForms Hook
 *
 * Simplified React hooks for form data management using React Query.
 *
 * Features:
 * - Automatic caching with React Query
 * - Optimistic updates
 * - Automatic conflict detection and resolution
 * - Error handling with user-friendly alerts
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import {
  createForm,
  updateForm,
  deleteForm,
  fetchForm,
  fetchForms,
  fetchFormsByPin,
  ConflictError,
} from '../services/api/forms';
import type { Form } from '../db/types';

/**
 * Fetch all forms
 */
export function useForms() {
  return useQuery({
    queryKey: ['forms'],
    queryFn: fetchForms,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch forms for a specific pin
 */
export function useFormsByPin(pinId: string) {
  return useQuery({
    queryKey: ['forms', 'pin', pinId],
    queryFn: () => fetchFormsByPin(pinId),
    enabled: !!pinId,
    staleTime: 30000,
  });
}

/**
 * Fetch a single form by ID
 */
export function useForm(formId: string) {
  return useQuery({
    queryKey: ['forms', formId],
    queryFn: () => fetchForm(formId),
    enabled: !!formId,
    staleTime: 30000,
  });
}

/**
 * Create a new form
 */
export function useCreateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      form: Omit<
        Form,
        'id' | 'version' | 'status' | 'lastSyncedAt' | 'lastFailedSyncAt' | 'failureReason'
      >;
      userId: string;
    }) => createForm(params),

    onSuccess: (newForm) => {
      // Update all forms cache
      queryClient.setQueryData(['forms'], (old: Form[] | undefined) => {
        return old ? [...old, newForm] : [newForm];
      });

      // Update pin-specific forms cache if applicable
      if (newForm.pinId) {
        queryClient.setQueryData(['forms', 'pin', newForm.pinId], (old: Form[] | undefined) => {
          return old ? [...old, newForm] : [newForm];
        });
      }

      // Set individual form cache
      queryClient.setQueryData(['forms', newForm.id], newForm);

      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },

    onError: (error) => {
      Alert.alert('Error', 'Failed to create form: ' + error.message);
      console.error('Create form error:', error);
    },
  });
}

/**
 * Update an existing form with conflict handling
 */
export function useUpdateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { form: Form; userId: string }) => updateForm(params),

    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['forms', variables.form.id] });

      // Snapshot previous value
      const previousForm = queryClient.getQueryData<Form>(['forms', variables.form.id]);

      // Optimistically update
      queryClient.setQueryData(['forms', variables.form.id], variables.form);

      return { previousForm };
    },

    onSuccess: (updatedForm) => {
      // Update individual form cache
      queryClient.setQueryData(['forms', updatedForm.id], updatedForm);

      // Update all forms list
      queryClient.setQueryData(['forms'], (old: Form[] | undefined) => {
        if (!old) return [updatedForm];
        return old.map((f) => (f.id === updatedForm.id ? updatedForm : f));
      });

      // Update pin-specific forms if applicable
      if (updatedForm.pinId) {
        queryClient.setQueryData(['forms', 'pin', updatedForm.pinId], (old: Form[] | undefined) => {
          if (!old) return [updatedForm];
          return old.map((f) => (f.id === updatedForm.id ? updatedForm : f));
        });
      }

      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },

    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousForm) {
        queryClient.setQueryData(['forms', variables.form.id], context.previousForm);
      }

      if (error instanceof ConflictError) {
        // Conflict detected - show resolution dialog
        Alert.alert(
          'Conflict Detected',
          'This form was modified by another user. How would you like to proceed?',
          [
            {
              text: 'Use Server Version',
              onPress: () => {
                // Accept server's version
                if (error.currentState) {
                  queryClient.setQueryData(['forms', variables.form.id], error.currentState);
                  queryClient.invalidateQueries({ queryKey: ['forms'] });
                }
              },
            },
            {
              text: 'Keep My Changes',
              onPress: async () => {
                // Retry with new version
                try {
                  const updatedForm = {
                    ...variables.form,
                    version: error.currentVersion || 1,
                  };
                  const result = await updateForm({ form: updatedForm, userId: variables.userId });
                  queryClient.setQueryData(['forms', result.id], result);
                  queryClient.invalidateQueries({ queryKey: ['forms'] });
                  Alert.alert('Success', 'Your changes have been saved');
                } catch (retryError) {
                  Alert.alert('Error', 'Failed to save changes');
                  console.error('Retry error:', retryError);
                }
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to update form: ' + error.message);
        console.error('Update form error:', error);
      }
    },
  });
}

/**
 * Delete a form
 */
export function useDeleteForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { formId: string; version: number; userId: string }) => deleteForm(params),

    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['forms'] });

      // Snapshot previous value
      const previousForms = queryClient.getQueryData<Form[]>(['forms']);

      // Optimistically remove from cache
      queryClient.setQueryData(['forms'], (old: Form[] | undefined) => {
        return old ? old.filter((f) => f.id !== variables.formId) : [];
      });

      return { previousForms };
    },

    onSuccess: (_, variables) => {
      // Remove from individual cache
      queryClient.removeQueries({ queryKey: ['forms', variables.formId] });

      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },

    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousForms) {
        queryClient.setQueryData(['forms'], context.previousForms);
      }

      if (error instanceof ConflictError) {
        Alert.alert(
          'Conflict Detected',
          'This form was modified by another user and cannot be deleted. Please refresh and try again.',
          [
            {
              text: 'OK',
              onPress: () => {
                queryClient.invalidateQueries({ queryKey: ['forms'] });
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to delete form: ' + error.message);
        console.error('Delete form error:', error);
      }
    },
  });
}
