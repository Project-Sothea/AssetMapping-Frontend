/**
 * usePins Hook
 *
 * Simplified React hooks for pin data management using React Query.
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
  createPin,
  updatePin,
  deletePin,
  fetchPin,
  fetchPins,
  ConflictError,
} from '../services/api/pins';
import type { Pin } from '../db/types';

/**
 * Fetch all pins
 */
export function usePins() {
  return useQuery({
    queryKey: ['pins'],
    queryFn: fetchPins,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (previously cacheTime)
  });
}

/**
 * Fetch a single pin by ID
 */
export function usePin(pinId: string) {
  return useQuery({
    queryKey: ['pins', pinId],
    queryFn: () => fetchPin(pinId),
    enabled: !!pinId,
    staleTime: 30000,
  });
}

/**
 * Create a new pin
 */
export function useCreatePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      pin: Omit<
        Pin,
        | 'id'
        | 'version'
        | 'status'
        | 'lastSyncedAt'
        | 'lastFailedSyncAt'
        | 'failureReason'
        | 'localImages'
      >;
      userId: string;
    }) => createPin(params),

    onSuccess: (newPin) => {
      // Optimistically update cache
      queryClient.setQueryData(['pins'], (old: Pin[] | undefined) => {
        return old ? [...old, newPin] : [newPin];
      });

      // Also set individual pin cache
      queryClient.setQueryData(['pins', newPin.id], newPin);

      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['pins'] });
    },

    onError: (error) => {
      Alert.alert('Error', 'Failed to create pin: ' + error.message);
      console.error('Create pin error:', error);
    },
  });
}

/**
 * Update an existing pin with conflict handling
 */
export function useUpdatePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { pin: Pin; userId: string }) => updatePin(params),

    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['pins', variables.pin.id] });

      // Snapshot previous value
      const previousPin = queryClient.getQueryData<Pin>(['pins', variables.pin.id]);

      // Optimistically update
      queryClient.setQueryData(['pins', variables.pin.id], variables.pin);

      return { previousPin };
    },

    onSuccess: (updatedPin) => {
      // Update individual pin cache
      queryClient.setQueryData(['pins', updatedPin.id], updatedPin);

      // Update list cache
      queryClient.setQueryData(['pins'], (old: Pin[] | undefined) => {
        if (!old) return [updatedPin];
        return old.map((p) => (p.id === updatedPin.id ? updatedPin : p));
      });

      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['pins'] });
    },

    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousPin) {
        queryClient.setQueryData(['pins', variables.pin.id], context.previousPin);
      }

      if (error instanceof ConflictError) {
        // Conflict detected - show resolution dialog
        Alert.alert(
          'Conflict Detected',
          'This pin was modified by another user. How would you like to proceed?',
          [
            {
              text: 'Use Server Version',
              onPress: () => {
                // Accept server's version
                if (error.currentState) {
                  queryClient.setQueryData(['pins', variables.pin.id], error.currentState);
                  queryClient.invalidateQueries({ queryKey: ['pins'] });
                }
              },
            },
            {
              text: 'Keep My Changes',
              onPress: async () => {
                // Retry with new version
                try {
                  const updatedPin = {
                    ...variables.pin,
                    version: error.currentVersion || 1,
                  };
                  const result = await updatePin({ pin: updatedPin, userId: variables.userId });
                  queryClient.setQueryData(['pins', result.id], result);
                  queryClient.invalidateQueries({ queryKey: ['pins'] });
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
        Alert.alert('Error', 'Failed to update pin: ' + error.message);
        console.error('Update pin error:', error);
      }
    },
  });
}

/**
 * Delete a pin
 */
export function useDeletePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { pinId: string; version: number; userId: string }) => deletePin(params),

    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['pins'] });

      // Snapshot previous value
      const previousPins = queryClient.getQueryData<Pin[]>(['pins']);

      // Optimistically remove from cache
      queryClient.setQueryData(['pins'], (old: Pin[] | undefined) => {
        return old ? old.filter((p) => p.id !== variables.pinId) : [];
      });

      return { previousPins };
    },

    onSuccess: (_, variables) => {
      // Remove from individual cache
      queryClient.removeQueries({ queryKey: ['pins', variables.pinId] });

      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['pins'] });
    },

    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousPins) {
        queryClient.setQueryData(['pins'], context.previousPins);
      }

      if (error instanceof ConflictError) {
        Alert.alert(
          'Conflict Detected',
          'This pin was modified by another user and cannot be deleted. Please refresh and try again.',
          [
            {
              text: 'OK',
              onPress: () => {
                queryClient.invalidateQueries({ queryKey: ['pins'] });
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to delete pin: ' + error.message);
        console.error('Delete pin error:', error);
      }
    },
  });
}
