# Sync Service Test Suite

## Overview

Comprehensive test suite for the sync service covering all layers: strategy, manager, handlers, and initialization.

## Test Files Created

### 1. SyncStrategy Tests (`services/sync/logic/syncing/__tests__/SyncStrategy.test.ts`)

**Purpose**: Tests the conflict resolution and data transformation logic

**Coverage**:

- ✅ `convertToLocal()` - Remote to local format conversion (snake_case → camelCase)
- ✅ `convertToRemote()` - Local to remote format conversion (camelCase → snake_case)
- ✅ `resolve()` - Conflict resolution logic
  - New items (local-only and remote-only)
  - Deletions (local and remote)
  - Timestamp-based conflict resolution
  - Equal timestamp with dirty status handling
  - Multiple items with different scenarios
  - Edge cases (empty arrays, null timestamps)

**Key Test Scenarios**:

- Array stringification/parsing
- Null value handling
- Timestamp comparison logic
- Status-based resolution (dirty vs synced)
- Complex multi-item sync scenarios

### 2. SyncManager Tests (`services/sync/__tests__/SyncManager.test.ts`)

**Purpose**: Tests the orchestration of sync handlers and state management

**Coverage**:

- ✅ Singleton pattern
- ✅ Handler registration (`addHandler()`)
- ✅ Sync execution (`syncNow()`)
  - Success scenarios
  - Failure scenarios
  - Deduplication (preventing concurrent syncs)
- ✅ State management (`getState()`)
- ✅ Subscription system
  - Listener notifications
  - Unsubscribe functionality
  - Multiple listeners
- ✅ Display status formatting (`getDisplayStatus()`)

**Key Test Scenarios**:

- Multiple handlers with mixed success/failure
- State transitions (isSyncing, lastSyncedAt, lastSyncFailure)
- Listener lifecycle and isolation
- Error counting and reporting

### 3. PinSyncHandler Tests (`services/sync/logic/handlers/__tests__/PinSyncHandler.test.ts`)

**Purpose**: Tests Pin-specific sync logic including image handling

**Coverage**:

- ✅ Basic sync flow
  - Repository fetch operations
  - Upsert to local and remote
  - Mark as synced
- ✅ Image handling (`postSync()`)
  - Download images for local upserts
  - Upload images for remote upserts
  - Update DB with image paths
  - Handle null/empty images
  - Multiple pins with images
- ✅ Error handling
  - Repository errors
  - ImageManager errors
  - Update operation failures

**Key Test Scenarios**:

- Image download and local path storage
- Image upload and URL update
- Batch image processing
- Graceful null handling

### 4. FormSyncHandler Tests (`services/sync/logic/handlers/__tests__/FormSyncHandler.test.ts`)

**Purpose**: Tests Form-specific sync logic

**Coverage**:

- ✅ Basic sync flow
  - Repository fetch operations
  - Upsert to local and remote
  - Mark as synced
- ✅ `postSync()` hook execution
- ✅ Error handling
  - Repository fetch errors
  - Upsert failures
  - Mark as synced errors

**Key Test Scenarios**:

- Simple form sync without complex post-processing
- Error propagation through sync pipeline

### 5. syncService Tests (`services/sync/__tests__/syncService.test.ts`)

**Purpose**: Tests initialization and factory functions

**Coverage**:

- ⚠️ Placeholder tests (module-level singletons make testing challenging)
- Documented areas for improvement:
  - `initializeSync()` - Initialization with default ImageManager
  - `getSyncManager()` - Getter with error handling
  - `getLocalPinRepo()` - Repository getter
  - `getLocalFormRepo()` - Repository getter

**Notes**:

- Current implementation uses module-level state which is difficult to test
- Recommended refactoring: Use dependency injection for better testability
- Tests serve as documentation for expected behavior

## Test Statistics

| Component       | Test File                 | Tests           | Status                  |
| --------------- | ------------------------- | --------------- | ----------------------- |
| SyncStrategy    | `SyncStrategy.test.ts`    | 15              | ✅ Passing              |
| SyncManager     | `SyncManager.test.ts`     | 25+             | ✅ Passing              |
| PinSyncHandler  | `PinSyncHandler.test.ts`  | 12              | ✅ Passing              |
| FormSyncHandler | `FormSyncHandler.test.ts` | 7               | ✅ Passing              |
| syncService     | `syncService.test.ts`     | 1 (placeholder) | ⚠️ Needs implementation |

**Total**: ~60 comprehensive test cases

## Running the Tests

```bash
# Run all sync service tests
npm test -- services/sync

# Run specific test file
npm test -- SyncStrategy.test.ts

# Run with coverage
npm test -- --coverage services/sync
```

## Test Patterns Used

### 1. Mock Implementations

```typescript
class MockLocalRepo implements Partial<LocalRepository<Pin, typeof pins>> {
  fetchAll = jest.fn().mockResolvedValue([]);
  upsertAll = jest.fn().mockResolvedValue(undefined);
  // ...
}
```

### 2. Spy on Protected Methods

```typescript
const postSyncSpy = jest.spyOn(handler as any, 'postSync');
await handler.execute();
expect(postSyncSpy).toHaveBeenCalled();
```

### 3. State Verification

```typescript
const states: any[] = [];
const listener = jest.fn((state) => states.push({ ...state }));
manager.subscribe(listener);
// Verify state transitions
expect(states[0].isSyncing).toBe(true);
expect(states[states.length - 1].isSyncing).toBe(false);
```

## Known Limitations

1. **syncService testability**: Module-level singletons make comprehensive testing difficult
2. **Integration tests**: Current tests are unit tests; integration tests with real DB would be valuable
3. **ImageManager mocking**: Some complex image scenarios may need more detailed mocking
4. **Type safety**: Some tests use `as any` to access private members for testing

## Recommendations for Future Improvements

1. **Refactor syncService** to use dependency injection instead of module-level state
2. **Add integration tests** that test the full sync pipeline with real local DB
3. **Add performance tests** for large dataset synchronization
4. **Mock Supabase responses** more comprehensively for network error scenarios
5. **Add tests for edge cases** like network interruptions mid-sync
6. **Test concurrent sync attempts** from multiple sources
7. **Add tests for partial sync failures** and rollback behavior

## Related Documentation

- See `TESTING_GUIDE.md` for general testing setup
- See `services/sync/README.md` for sync architecture overview
- See Phase 1 refactoring docs for service layer patterns
