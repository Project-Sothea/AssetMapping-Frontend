/**
 * Utility functions for Sync Queue System
 *
 * Provides helpers for idempotency key generation,
 * backoff calculations, and device identification.
 */

import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { IdempotencyKeyComponents, BACKOFF_DELAYS } from './types';

// ==================== Device Identification ====================

let _deviceId: string | null = null;

/**
 * Get unique device identifier (cached)
 * Combines device info for stable ID across app launches
 */
export async function getDeviceId(): Promise<string> {
  if (_deviceId) {
    return _deviceId;
  }

  // Combine multiple device properties for stable ID
  const components = [
    Platform.OS || 'unknown',
    Platform.Version?.toString() || 'unknown',
    Constants.sessionId || Date.now().toString(),
  ];

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    components.join('|')
  );

  _deviceId = hash.substring(0, 16); // Shorter for storage

  return _deviceId;
}

/**
 * Reset device ID (useful for testing)
 */
export function resetDeviceId(): void {
  _deviceId = null;
}

// ==================== Idempotency ====================

/**
 * Generate unique idempotency key for an operation
 * Ensures same operation never executed twice
 *
 * @param components - Operation details
 * @returns SHA-256 hash of operation components
 */
export async function generateIdempotencyKey(
  components: IdempotencyKeyComponents
): Promise<string> {
  const parts = [
    components.operation,
    components.entityType,
    components.entityId,
    components.timestamp,
    components.deviceId,
  ];

  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, parts.join('|'));

  return hash;
}

/**
 * Check if two idempotency keys match
 */
export function areIdempotencyKeysEqual(key1: string, key2: string): boolean {
  return key1 === key2;
}

// ==================== Retry Logic ====================

/**
 * Calculate backoff delay for retry attempt
 * Uses exponential backoff with jitter
 *
 * @param attemptNumber - Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(attemptNumber: number): number {
  // Use predefined delays, fallback to exponential for higher attempts
  const baseDelay = BACKOFF_DELAYS[attemptNumber] ?? Math.pow(2, attemptNumber) * 1000;

  // Add jitter (±20%) to prevent thundering herd
  const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);

  return Math.floor(baseDelay + jitter);
}

/**
 * Check if operation should be retried
 *
 * @param attempts - Current attempt count
 * @param maxAttempts - Maximum allowed attempts
 * @returns true if should retry
 */
export function shouldRetry(attempts: number, maxAttempts: number): boolean {
  return attempts < maxAttempts;
}

// ==================== Timestamp Utilities ====================

/**
 * Get current ISO timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Check if timestamp is within last N milliseconds
 */
export function isTimestampRecent(timestamp: string, withinMs: number): boolean {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  return now - then <= withinMs;
}

/**
 * Get age of timestamp in milliseconds
 */
export function getTimestampAge(timestamp: string): number {
  return Date.now() - new Date(timestamp).getTime();
}

// ==================== Validation ====================

/**
 * Validate operation input
 */
export function validateOperationInput(input: any): string | null {
  if (!input.operation) {
    return 'Operation type is required';
  }

  if (!['create', 'update', 'delete'].includes(input.operation)) {
    return `Invalid operation type: ${input.operation}`;
  }

  if (!input.entityType) {
    return 'Entity type is required';
  }

  if (!['pin', 'form'].includes(input.entityType)) {
    return `Invalid entity type: ${input.entityType}`;
  }

  if (!input.entityId) {
    return 'Entity ID is required';
  }

  if (!input.timestamp) {
    return 'Timestamp is required';
  }

  if (!input.data) {
    return 'Data payload is required';
  }

  return null; // Valid
}

// ==================== Sequence Numbers ====================

/**
 * Generate next sequence number (monotonically increasing)
 * Uses timestamp + counter for ordering
 */
let _sequenceCounter = 0;

export function getNextSequenceNumber(): number {
  const timestamp = Date.now();
  const counter = _sequenceCounter++;

  // Reset counter every second to prevent overflow
  if (_sequenceCounter > 1000) {
    _sequenceCounter = 0;
  }

  // Combine timestamp with counter for unique, ordered sequence
  return timestamp * 1000 + counter;
}

/**
 * Reset sequence counter (useful for testing)
 */
export function resetSequenceCounter(): void {
  _sequenceCounter = 0;
}

// ==================== Formatting ====================

/**
 * Format operation for logging
 */
export function formatOperation(op: {
  operation: string;
  entityType: string;
  entityId: string;
}): string {
  return `${op.operation.toUpperCase()} ${op.entityType}:${op.entityId.substring(0, 8)}`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else if (ms < 3600000) {
    return `${(ms / 60000).toFixed(1)}m`;
  } else {
    return `${(ms / 3600000).toFixed(1)}h`;
  }
}

// ==================== Error Handling ====================

/**
 * Check if error is network-related (retriable)
 */
export function isNetworkError(error: Error): boolean {
  const networkErrorMessages = [
    'network',
    'timeout',
    'fetch failed',
    'enotfound',
    'econnrefused',
    'etimedout',
  ];

  const message = error.message.toLowerCase();
  return networkErrorMessages.some((keyword) => message.includes(keyword));
}

/**
 * Check if error is conflict (not retriable)
 */
export function isConflictError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return message.includes('conflict') || message.includes('409');
}

/**
 * Extract user-friendly error message
 */
export function getUserFriendlyError(error: Error): string {
  if (isNetworkError(error)) {
    return 'Network connection issue. Will retry automatically.';
  }

  if (isConflictError(error)) {
    return 'This data was modified elsewhere. Please refresh and try again.';
  }

  // Default generic message
  return 'Sync failed. Will retry automatically.';
}
