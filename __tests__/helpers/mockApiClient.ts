/**
 * Mock API Client
 * Simulates backend responses for testing
 */

export function createMockApiClient(options: any = {}) {
  return {
    syncItem: jest.fn().mockResolvedValue({
      success: true,
      data: { version: 2, id: 'test-id' },
      ...options.syncItem,
    }),

    fetchPins: jest.fn().mockResolvedValue({
      success: true,
      data: [],
      ...options.fetchPins,
    }),

    fetchForms: jest.fn().mockResolvedValue({
      success: true,
      data: [],
      ...options.fetchForms,
    }),
  };
}

export function createConflictResponse() {
  return {
    success: false,
    error: 'Conflict: Server has newer data (version mismatch)',
  };
}

export function createSuccessResponse(data: any) {
  return {
    success: true,
    data,
  };
}

export function createErrorResponse(error: string) {
  return {
    success: false,
    error,
  };
}
