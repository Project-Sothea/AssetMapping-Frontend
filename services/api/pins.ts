/**
 * Pin API Service
 *
 * Simplified API service for pins using versioned endpoints
 * with automatic conflict detection.
 *
 * Features:
 * - Optimistic concurrency control via version numbers
 * - Automatic conflict detection (409 responses)
 * - Simple create/update/delete operations
 * - ConflictError for user-friendly error handling
 */

import { apiClient } from '../apiClient';
import type { Pin } from '../../db/types';

/**
 * Custom error for version conflicts
 */
export class ConflictError extends Error {
  constructor(
    message: string,
    public currentState?: Pin,
    public currentVersion?: number
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}

interface PinApiResponse {
  success: boolean;
  data?: {
    pin: Pin;
    version: number;
  };
  conflict?: boolean;
  currentVersion?: number;
  currentState?: Pin;
  error?: string;
}

interface CreatePinParams {
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
}

interface UpdatePinParams {
  pin: Pin;
  userId: string;
}

interface DeletePinParams {
  pinId: string;
  version: number;
  userId: string;
}

/**
 * Create a new pin
 * Backend will assign ID and version=1
 */
export async function createPin({ pin, userId }: CreatePinParams): Promise<Pin> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/pins`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...pin,
        userId,
      }),
    }
  );

  const data: any = await response.json();

  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.error || 'Failed to create pin');
  }

  // Backend returns the pin directly in data.data, not data.data.pin
  return data.data as Pin;
}

/**
 * Update an existing pin
 * Includes baseVersion for optimistic concurrency control
 * Throws ConflictError if pin was modified by another user
 */
export async function updatePin({ pin, userId }: UpdatePinParams): Promise<Pin> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/pins`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...pin,
        baseVersion: pin.version, // Send current version for conflict detection
        userId,
      }),
    }
  );

  const data: any = await response.json();

  // Handle 409 Conflict
  if (response.status === 409 && data.conflict) {
    throw new ConflictError(
      'Pin was modified by another user',
      data.currentState as Pin,
      data.currentVersion
    );
  }

  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.error || 'Failed to update pin');
  }

  // Backend returns the pin directly in data.data, not data.data.pin
  return data.data as Pin;
}

/**
 * Delete a pin (soft delete)
 * Includes version for optimistic concurrency control
 */
export async function deletePin({ pinId, version, userId }: DeletePinParams): Promise<void> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/pins/${pinId}?userId=${userId}&version=${version}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const data: PinApiResponse = await response.json();

  // Handle 409 Conflict
  if (response.status === 409 && data.conflict) {
    throw new ConflictError(
      'Pin was modified by another user',
      data.currentState,
      data.currentVersion
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete pin');
  }
}

/**
 * Fetch a single pin by ID
 */
export async function fetchPin(pinId: string): Promise<Pin> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/pins/${pinId}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const data: { success: boolean; data?: Pin; error?: string } = await response.json();

  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.error || 'Pin not found');
  }

  return data.data;
}

/**
 * Fetch all pins
 */
export async function fetchPins(): Promise<Pin[]> {
  const response = await apiClient.fetchPins();

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch pins');
  }

  return response.data as Pin[];
}
