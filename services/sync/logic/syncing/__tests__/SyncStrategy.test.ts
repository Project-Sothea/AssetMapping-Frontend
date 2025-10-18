/**
 * Tests for SyncStrategy
 *
 * Tests conflict resolution logic and data transformation between local and remote formats
 * Following SLAP, KISS, and explicit coding principles
 */

import { SyncStrategy } from '../SyncStrategy';

// ==================== Constants ====================
// Magic numbers defined as named constants for clarity

const TEST_TIMESTAMPS = {
  EARLY: '2025-01-01T00:00:00Z',
  LATE: '2025-01-02T00:00:00Z',
  LATER: '2025-01-03T00:00:00Z',
} as const;

const TEST_IDS = {
  ONE: '1',
  TWO: '2',
  THREE: '3',
  FOUR: '4',
} as const;

const SYNC_STATUS = {
  SYNCED: 'synced',
  DIRTY: 'dirty',
} as const;

const EXPECTED_COUNTS = {
  NONE: 0,
  ONE: 1,
  TWO: 2,
} as const;

const EXPECTED_JSON_STRINGS = {
  EMPTY_ARRAY: '[]',
  TWO_ELEMENTS: '["a","b"]',
  NULL: 'null',
} as const;

// ==================== Type Definitions ====================
// Clear, descriptive names (avoiding misleading names)

type TestLocalItem = {
  id: string;
  updatedAt: string | null;
  deletedAt: string | null;
  status: string | null;
  name: string;
  someArray: string; // Stringified JSON array (local DB format)
};

type TestRemoteItem = {
  id: string;
  updated_at: string | null;
  deleted_at: string | null;
  name: string;
  some_array: any; // Parsed array (remote API format)
};

// ==================== Test Data Factories ====================
// SLAP: Single Level of Abstraction Principle
// Factory functions isolate object creation logic

function createRemoteItem(overrides: Partial<TestRemoteItem> = {}): TestRemoteItem {
  return {
    id: TEST_IDS.ONE,
    updated_at: TEST_TIMESTAMPS.EARLY,
    deleted_at: null,
    name: 'Test Item',
    some_array: [],
    ...overrides,
  };
}

function createLocalItem(overrides: Partial<TestLocalItem> = {}): TestLocalItem {
  return {
    id: TEST_IDS.ONE,
    updatedAt: TEST_TIMESTAMPS.EARLY,
    deletedAt: null,
    status: SYNC_STATUS.SYNCED,
    name: 'Test Item',
    someArray: EXPECTED_JSON_STRINGS.EMPTY_ARRAY,
    ...overrides,
  };
}

// ==================== Test Suite ====================

describe('SyncStrategy', () => {
  let strategy: SyncStrategy<TestLocalItem, TestRemoteItem>;

  beforeEach(() => {
    strategy = new SyncStrategy<TestLocalItem, TestRemoteItem>();
  });

  // ==================== Data Transformation Tests ====================

  describe('convertToLocal', () => {
    it('should convert remote format to local format with snake_case to camelCase transformation', () => {
      // Arrange: Create test data
      const remoteItems = [
        createRemoteItem({
          updated_at: TEST_TIMESTAMPS.EARLY,
          some_array: ['a', 'b'],
        }),
      ];

      // Act: Perform conversion
      const result = strategy.convertToLocal(remoteItems);

      // Assert: Verify transformation (Guard Conditions - check expected state first)
      expect(result).toHaveLength(EXPECTED_COUNTS.ONE);
      expect(result[0]).toMatchObject({
        id: TEST_IDS.ONE,
        updatedAt: TEST_TIMESTAMPS.EARLY,
        deletedAt: null,
        name: 'Test Item',
      });
      expect(result[0].someArray).toBe(EXPECTED_JSON_STRINGS.TWO_ELEMENTS);
    });

    it('should preserve null values during conversion', () => {
      // Arrange
      const remoteItems = [
        createRemoteItem({
          updated_at: null,
          deleted_at: null,
          some_array: null,
        }),
      ];

      // Act
      const result = strategy.convertToLocal(remoteItems);

      // Assert: Guard Conditions - check nulls are preserved
      expect(result[0].updatedAt).toBeNull();
      expect(result[0].deletedAt).toBeNull();
      expect(result[0].someArray).toBeNull();
    });

    it('should stringify empty arrays correctly', () => {
      // Arrange
      const remoteItems = [createRemoteItem({ some_array: [] })];

      // Act
      const result = strategy.convertToLocal(remoteItems);

      // Assert
      expect(result[0].someArray).toBe(EXPECTED_JSON_STRINGS.EMPTY_ARRAY);
    });
  });

  describe('convertToRemote', () => {
    it('should convert local format to remote format with camelCase to snake_case transformation', () => {
      // Arrange
      const localItems = [
        createLocalItem({
          someArray: EXPECTED_JSON_STRINGS.TWO_ELEMENTS,
        }),
      ];

      // Act
      const result = strategy.convertToRemote(localItems);

      // Assert
      expect(result).toHaveLength(EXPECTED_COUNTS.ONE);
      expect(result[0]).toMatchObject({
        id: TEST_IDS.ONE,
        updated_at: TEST_TIMESTAMPS.EARLY,
        deleted_at: null,
        name: 'Test Item',
      });
      expect(result[0].some_array).toEqual(['a', 'b']);
    });

    it('should preserve null values during conversion', () => {
      // Arrange
      const localItems = [
        createLocalItem({
          updatedAt: null,
          deletedAt: null,
          status: null,
          someArray: EXPECTED_JSON_STRINGS.NULL,
        }),
      ];

      // Act
      const result = strategy.convertToRemote(localItems);

      // Assert
      expect(result[0].updated_at).toBeNull();
      expect(result[0].deleted_at).toBeNull();
      expect(result[0].some_array).toBe(EXPECTED_JSON_STRINGS.NULL);
    });

    it('should parse stringified arrays correctly', () => {
      // Arrange
      const localItems = [createLocalItem({ someArray: EXPECTED_JSON_STRINGS.EMPTY_ARRAY })];

      // Act
      const result = strategy.convertToRemote(localItems);

      // Assert
      expect(result[0].some_array).toEqual([]);
    });
  });

  // ==================== Conflict Resolution Tests ====================

  describe('resolve - New items', () => {
    it('should pull new remote items that do not exist locally', () => {
      // Arrange: No local items, one remote item
      const localItems: TestLocalItem[] = [];
      const remoteItems = [createRemoteItem({ id: TEST_IDS.ONE, name: 'Remote Item' })];

      // Act
      const { toLocal, toRemote } = strategy.resolve(localItems, remoteItems);

      // Assert: Guard Conditions - verify expected outcomes first
      expect(toLocal).toHaveLength(EXPECTED_COUNTS.ONE);
      expect(toLocal[0].id).toBe(TEST_IDS.ONE);
      expect(toRemote).toHaveLength(EXPECTED_COUNTS.NONE);
    });

    it('should push new local items that do not exist remotely', () => {
      // Arrange: One local item, no remote items
      const localItems = [createLocalItem({ status: SYNC_STATUS.DIRTY, name: 'Local Item' })];
      const remoteItems: TestRemoteItem[] = [];

      // Act
      const { toLocal, toRemote } = strategy.resolve(localItems, remoteItems);

      // Assert
      expect(toLocal).toHaveLength(EXPECTED_COUNTS.NONE);
      expect(toRemote).toHaveLength(EXPECTED_COUNTS.ONE);
      expect(toRemote[0].id).toBe(TEST_IDS.ONE);
    });
  });

  describe('resolve - Deletions', () => {
    it('should pull remote deletion when item deleted remotely but exists locally', () => {
      // Arrange: Item exists locally, deleted remotely
      const localItems = [createLocalItem()];
      const remoteItems = [
        createRemoteItem({
          deleted_at: TEST_TIMESTAMPS.LATE,
        }),
      ];

      // Act
      const { toLocal, toRemote } = strategy.resolve(localItems, remoteItems);

      // Assert: Guard Conditions
      expect(toLocal).toHaveLength(EXPECTED_COUNTS.ONE);
      expect(toLocal[0].id).toBe(TEST_IDS.ONE);
      expect(toLocal[0].deleted_at).toBe(TEST_TIMESTAMPS.LATE);
      expect(toRemote).toHaveLength(EXPECTED_COUNTS.NONE);
    });

    it('should push local deletion when item deleted locally but exists remotely', () => {
      // Arrange: Item deleted locally, exists remotely
      const localItems = [
        createLocalItem({
          deletedAt: TEST_TIMESTAMPS.LATE,
          status: SYNC_STATUS.DIRTY,
        }),
      ];
      const remoteItems = [createRemoteItem()];

      // Act
      const { toLocal, toRemote } = strategy.resolve(localItems, remoteItems);

      // Assert
      expect(toLocal).toHaveLength(EXPECTED_COUNTS.NONE);
      expect(toRemote).toHaveLength(EXPECTED_COUNTS.ONE);
      expect(toRemote[0].id).toBe(TEST_IDS.ONE);
      expect(toRemote[0].deletedAt).toBe(TEST_TIMESTAMPS.LATE);
    });
  });

  describe('resolve - Timestamp-based conflict resolution', () => {
    it('should pull remote update when remote timestamp is newer', () => {
      // Arrange: Local has early timestamp, remote has late timestamp
      const localItems = [
        createLocalItem({
          updatedAt: TEST_TIMESTAMPS.EARLY,
          name: 'Local Version',
        }),
      ];
      const remoteItems = [
        createRemoteItem({
          updated_at: TEST_TIMESTAMPS.LATE,
          name: 'Remote Version',
        }),
      ];

      // Act
      const { toLocal, toRemote } = strategy.resolve(localItems, remoteItems);

      // Assert: Remote wins
      expect(toLocal).toHaveLength(EXPECTED_COUNTS.ONE);
      expect(toLocal[0].id).toBe(TEST_IDS.ONE);
      expect(toLocal[0].name).toBe('Remote Version');
      expect(toRemote).toHaveLength(EXPECTED_COUNTS.NONE);
    });

    it('should push local update when local timestamp is newer', () => {
      // Arrange: Local has late timestamp, remote has early timestamp
      const localItems = [
        createLocalItem({
          updatedAt: TEST_TIMESTAMPS.LATE,
          status: SYNC_STATUS.DIRTY,
          name: 'Local Version',
        }),
      ];
      const remoteItems = [
        createRemoteItem({
          updated_at: TEST_TIMESTAMPS.EARLY,
          name: 'Remote Version',
        }),
      ];

      // Act
      const { toLocal, toRemote } = strategy.resolve(localItems, remoteItems);

      // Assert: Local wins
      expect(toLocal).toHaveLength(EXPECTED_COUNTS.NONE);
      expect(toRemote).toHaveLength(EXPECTED_COUNTS.ONE);
      expect(toRemote[0].id).toBe(TEST_IDS.ONE);
      expect(toRemote[0].name).toBe('Local Version');
    });

    it('should prioritize deletedAt timestamp over updatedAt in comparison', () => {
      // Arrange: Local deleted later than remote update
      const localItems = [
        createLocalItem({
          updatedAt: TEST_TIMESTAMPS.EARLY,
          deletedAt: TEST_TIMESTAMPS.LATER, // Deletion is most recent
          status: SYNC_STATUS.DIRTY,
        }),
      ];
      const remoteItems = [
        createRemoteItem({
          updated_at: TEST_TIMESTAMPS.LATE,
          deleted_at: null,
        }),
      ];

      // Act
      const { toLocal, toRemote } = strategy.resolve(localItems, remoteItems);

      // Assert: Local deletion wins (later timestamp)
      expect(toLocal).toHaveLength(EXPECTED_COUNTS.NONE);
      expect(toRemote).toHaveLength(EXPECTED_COUNTS.ONE);
      expect(toRemote[0].deletedAt).toBe(TEST_TIMESTAMPS.LATER);
    });
  });

  describe('resolve - Equal timestamps', () => {
    it('should push to remote when timestamps equal and local marked dirty', () => {
      // Arrange: Same timestamp, but local is dirty
      const localItems = [
        createLocalItem({
          updatedAt: TEST_TIMESTAMPS.EARLY,
          status: SYNC_STATUS.DIRTY, // Key: dirty status breaks tie
          name: 'Local Version',
        }),
      ];
      const remoteItems = [
        createRemoteItem({
          updated_at: TEST_TIMESTAMPS.EARLY,
          name: 'Remote Version',
        }),
      ];

      // Act
      const { toLocal, toRemote } = strategy.resolve(localItems, remoteItems);

      // Assert: Dirty local wins tie
      expect(toLocal).toHaveLength(EXPECTED_COUNTS.NONE);
      expect(toRemote).toHaveLength(EXPECTED_COUNTS.ONE);
      expect(toRemote[0].id).toBe(TEST_IDS.ONE);
    });

    it('should do nothing when timestamps equal and local marked synced', () => {
      // Arrange: Same timestamp, local already synced
      const localItems = [
        createLocalItem({
          updatedAt: TEST_TIMESTAMPS.EARLY,
          status: SYNC_STATUS.SYNCED, // Already in sync
        }),
      ];
      const remoteItems = [
        createRemoteItem({
          updated_at: TEST_TIMESTAMPS.EARLY,
        }),
      ];

      // Act
      const { toLocal, toRemote } = strategy.resolve(localItems, remoteItems);

      // Assert: No sync needed
      expect(toLocal).toHaveLength(EXPECTED_COUNTS.NONE);
      expect(toRemote).toHaveLength(EXPECTED_COUNTS.NONE);
    });
  });

  describe('resolve - Multiple items', () => {
    it('should handle multiple items with different conflict resolution scenarios', () => {
      // Arrange: Complex scenario with 4 items
      const localItems = [
        createLocalItem({ id: TEST_IDS.ONE, updatedAt: TEST_TIMESTAMPS.EARLY }), // Item 1: Remote newer
        createLocalItem({
          id: TEST_IDS.TWO,
          updatedAt: TEST_TIMESTAMPS.LATE,
          status: SYNC_STATUS.DIRTY,
          name: 'Item 2 Local',
        }), // Item 2: Local newer
        createLocalItem({ id: TEST_IDS.THREE, status: SYNC_STATUS.DIRTY }), // Item 3: New local
      ];
      const remoteItems = [
        createRemoteItem({
          id: TEST_IDS.ONE,
          updated_at: TEST_TIMESTAMPS.LATE,
          name: 'Item 1 Remote',
        }), // Item 1: Remote newer
        createRemoteItem({ id: TEST_IDS.TWO, updated_at: TEST_TIMESTAMPS.EARLY }), // Item 2: Local newer
        createRemoteItem({ id: TEST_IDS.FOUR }), // Item 4: New remote
      ];

      // Act
      const { toLocal, toRemote } = strategy.resolve(localItems, remoteItems);

      // Assert: Verify correct resolution
      expect(toLocal).toHaveLength(EXPECTED_COUNTS.TWO); // Items 1 and 4
      expect(toLocal.find((item) => item.id === TEST_IDS.ONE)).toBeDefined();
      expect(toLocal.find((item) => item.id === TEST_IDS.FOUR)).toBeDefined();

      expect(toRemote).toHaveLength(EXPECTED_COUNTS.TWO); // Items 2 and 3
      expect(toRemote.find((item) => item.id === TEST_IDS.TWO)).toBeDefined();
      expect(toRemote.find((item) => item.id === TEST_IDS.THREE)).toBeDefined();
    });
  });

  describe('resolve - Edge cases', () => {
    it('should handle empty local and remote arrays gracefully', () => {
      // Arrange: Both empty
      const localItems: TestLocalItem[] = [];
      const remoteItems: TestRemoteItem[] = [];

      // Act
      const { toLocal, toRemote } = strategy.resolve(localItems, remoteItems);

      // Assert: No sync needed
      expect(toLocal).toHaveLength(EXPECTED_COUNTS.NONE);
      expect(toRemote).toHaveLength(EXPECTED_COUNTS.NONE);
    });

    it('should treat null timestamps as epoch zero for comparison', () => {
      // Arrange: Both have null timestamps
      const localItems = [createLocalItem({ updatedAt: null })];
      const remoteItems = [createRemoteItem({ updated_at: null })];

      // Act
      const { toLocal, toRemote } = strategy.resolve(localItems, remoteItems);

      // Assert: With equal (null) timestamps and synced status, no sync
      expect(toLocal).toHaveLength(EXPECTED_COUNTS.NONE);
      expect(toRemote).toHaveLength(EXPECTED_COUNTS.NONE);
    });

    it('should prefer item with timestamp over null timestamp', () => {
      // Arrange: Local has timestamp, remote has null
      const localItems = [
        createLocalItem({
          updatedAt: TEST_TIMESTAMPS.EARLY,
          status: SYNC_STATUS.DIRTY,
        }),
      ];
      const remoteItems = [createRemoteItem({ updated_at: null })];

      // Act
      const { toLocal, toRemote } = strategy.resolve(localItems, remoteItems);

      // Assert: Local wins (has timestamp vs null)
      expect(toRemote).toHaveLength(EXPECTED_COUNTS.ONE);
      expect(toLocal).toHaveLength(EXPECTED_COUNTS.NONE);
    });
  });
});
