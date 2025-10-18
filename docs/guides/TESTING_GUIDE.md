# Phase 3: Testing Guide

## Overview

This document outlines the testing strategy for the AssetMapping-Frontend application.

## Current Test Status

### ✅ Existing Tests

- `services/sync/__tests__/SyncManager.test.ts` - Sync manager tests
- `services/sync/logic/handlers/__tests__/BaseSyncHandler.test.ts` - Base sync handler tests

### 🔄 Tests To Write

#### 1. Service Layer Tests

**PinService Tests** (`features/pins/services/__tests__/PinService.test.ts`)

- ✅ Test file created (needs Jest environment setup)
- Tests cover:
  - `createPin()` - with/without images
  - `updatePin()` - with/without images
  - `deletePin()` - soft delete
  - `getPin()` - retrieve by ID
  - `getAllPins()` - filter deleted pins

**FormService Tests** (`features/forms/services/__tests__/FormService.test.ts`)

- Tests to cover:
  - `createForm()` - with UUID generation
  - `updateForm()` - update existing form
  - `deleteForm()` - soft delete
  - `getForm()` - retrieve by ID
  - `getFormsForPin()` - filter by pinId
  - `getAllForms()` - filter deleted forms

#### 2. Utility Tests

**PinTransformers** (`shared/utils/__tests__/pinTransformers.test.ts`)

- `formToDb()` - camelCase → snake_case conversion
- `dbToForm()` - snake_case → camelCase conversion
- `getSyncFields()` - generate sync metadata
- `getCreationFields()` - generate creation metadata

**FormTransformers** (`shared/utils/__tests__/formTransformers.test.ts`)

- Same as PinTransformers but for Forms

**ErrorHandler** (`shared/utils/__tests__/errorHandling.test.ts`)

- `handle()` - convert errors to AppError
- `showAlert()` - display user-friendly messages
- `log()` - log errors to console

## Jest Configuration Needed

### Setup File (`jest.setup.js`)

```javascript
// Mock React Native modules
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  })),
}));
```

### Update `package.json`

```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ]
  }
}
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test PinService.test.ts

# Run with coverage
npm test -- --coverage
```

## Test Coverage Goals

- **Services**: 80%+ coverage
- **Transformers**: 90%+ coverage
- **Error Handling**: 90%+ coverage

## Integration Tests (Future)

Consider adding integration tests for:

- End-to-end sync flow
- Image upload/download workflow
- Offline-first behavior

## Component Tests (Future)

Using React Native Testing Library:

- Pin form validation
- Form submission flows
- Image picker interactions

## Notes

- All tests should be isolated and not depend on real database
- Use mocks for all external dependencies (ImageManager, Supabase, etc.)
- Follow AAA pattern: Arrange, Act, Assert
- Test both success and error cases
- Use descriptive test names that explain what is being tested

## Example Test Template

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockRepo: jest.Mocked<Repository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      method: jest.fn(),
    } as any;
    service = new ServiceName(mockRepo);
  });

  describe('methodName', () => {
    it('should do something successfully', async () => {
      // Arrange
      const input = {};
      mockRepo.method.mockResolvedValue({});

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result.success).toBe(true);
      expect(mockRepo.method).toHaveBeenCalledWith(expect.objectContaining({}));
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockRepo.method.mockRejectedValue(new Error('Test error'));

      // Act
      const result = await service.methodName({});

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ERROR_CODE');
      }
    });
  });
});
```
