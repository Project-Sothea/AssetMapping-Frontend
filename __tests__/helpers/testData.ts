/**
 * Test Data Generators
 * Simple helpers to create test pins and forms
 */

import { v4 as uuidv4 } from 'uuid';

export function generateTestPin(overrides = {}) {
  return {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: null,
    deletedAt: null,
    version: 1,
    lat: 11.5564,
    lng: 104.9282,
    type: 'school',
    name: 'Test Pin',
    address: '123 Test St',
    cityVillage: 'Test Village',
    description: 'Test description',
    images: '[]',
    localImages: '[]',
    status: 'pending',
    failureReason: null,
    lastSyncedAt: null,
    lastFailedSyncAt: null,
    ...overrides,
  };
}

export function generateTestForm(pinId: string, overrides = {}) {
  return {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: null,
    deletedAt: null,
    version: 1,
    pinId,
    villageId: 'village-123',
    name: 'Test Person',
    village: 'Test Village',
    brushTeeth: 'yes',
    canAttend: 'yes',
    status: 'pending',
    failureReason: null,
    lastSyncedAt: null,
    lastFailedSyncAt: null,
    ...overrides,
  };
}

export function generateQueueOperation(overrides = {}) {
  return {
    id: uuidv4(),
    operation: 'create',
    entityType: 'pin',
    entityId: uuidv4(),
    idempotencyKey: `pin-${uuidv4()}-${Date.now()}`,
    payload: JSON.stringify(generateTestPin()),
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    sequenceNumber: Date.now(),
    deviceId: 'test-device',
    createdAt: new Date().toISOString(),
    lastAttemptAt: null,
    lastError: null,
    ...overrides,
  };
}
