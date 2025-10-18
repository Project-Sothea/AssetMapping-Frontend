# Soft Delete Pattern - Implementation & Rationale

## Overview

This app uses **soft deletes** instead of hard deletes for pins and forms. This document explains why and how it works.

---

## What is Soft Delete?

### Hard Delete (What We DON'T Do)

```sql
DELETE FROM pins WHERE id = 'abc123';
-- Record is permanently removed ❌
```

### Soft Delete (What We DO)

```sql
UPDATE pins
SET deleted_at = '2025-10-18T12:00:00Z',
    updated_at = '2025-10-18T12:00:00Z'
WHERE id = 'abc123';
-- Record still exists but marked as deleted ✅
```

---

## Architecture

### Database Schema

**Local SQLite (`db/schema.ts`):**

```typescript
export const pins = sqliteTable('pins', {
  id: text('id').primaryKey(),
  deletedAt: text('deleted_at'), // NULL = active, ISO timestamp = deleted
  updatedAt: text('updated_at'),
  // ... other fields
});
```

**Remote Supabase (`database.types.ts`):**

```typescript
{
  id: string;
  deleted_at: string | null; // NULL = active, timestamp = deleted
  updated_at: string;
  // ... other fields
}
```

---

## Implementation

### Local Delete (PinService)

```typescript
async deletePin(id: string): Promise<Result<void>> {
  // Soft delete: set deletedAt and mark as dirty for sync
  await this.localRepo.update({
    id,
    deletedAt: new Date().toISOString(),  // ✅ Mark as deleted
    status: 'dirty',                       // ✅ Queue for sync
    updatedAt: new Date().toISOString(),
  });
}
```

### Remote Sync (Queue → Supabase)

**Pins API (`apis/Pins/index.ts`):**

```typescript
export const deletePin = async (pinId: string) => {
  const { error } = await supabase
    .from('pins')
    .update({
      deleted_at: new Date().toISOString(), // ✅ Soft delete
      updated_at: new Date().toISOString(),
    })
    .eq('id', pinId);
};
```

**Forms API (`apis/Forms/index.ts`):**

```typescript
export const deleteForm = async (formId: string) => {
  const { error } = await supabase
    .from('forms')
    .update({
      deleted_at: new Date().toISOString(), // ✅ Soft delete
      updated_at: new Date().toISOString(),
    })
    .eq('id', formId);
};
```

---

## Why Soft Delete?

### ✅ 1. Multi-Device Sync

**Scenario**: User has 2 devices

**With Soft Delete:**

```
Device A: Delete pin → Sets deleted_at = 2025-10-18T12:00:00Z
Device B: Syncs → Sees deleted_at, marks local pin as deleted ✅
```

**With Hard Delete:**

```
Device A: Delete pin → Record removed from Supabase
Device B: Syncs → Doesn't know pin was deleted ❌
Result: Pin stays on Device B (zombie record) 👻
```

### ✅ 2. Conflict Resolution

**Scenario**: Two devices edit the same pin while offline

**With Soft Delete:**

```
Device A (offline): Edits pin at 12:00, updated_at = 12:00
Device B (offline): Deletes pin at 12:30, deleted_at = 12:30
Both sync: Compare timestamps → 12:30 > 12:00 → Delete wins ✅
```

**With Hard Delete:**

```
Device A: Edits pin
Device B: Hard deletes pin
Both sync: Pin recreated from Device A's edit (resurrection) 👻
```

### ✅ 3. Audit Trail

**Benefits:**

- See what was deleted and when
- Track user actions for analytics
- Debug sync issues
- Generate reports ("10 pins deleted this month")

```sql
-- Find recently deleted pins
SELECT * FROM pins
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

-- Count deletions per day
SELECT DATE(deleted_at), COUNT(*)
FROM pins
WHERE deleted_at IS NOT NULL
GROUP BY DATE(deleted_at);
```

### ✅ 4. Undo Capability

**Restore deleted item:**

```typescript
// Undo delete (if needed in future)
await supabase
  .from('pins')
  .update({
    deleted_at: null, // ✅ Restore
    updated_at: new Date().toISOString(),
  })
  .eq('id', pinId);
```

### ✅ 5. Data Integrity

**Prevents cascading issues:**

```
Pin has forms attached
Hard delete pin → Forms reference deleted pin (orphaned) ❌
Soft delete pin → Forms still reference valid record ✅
```

---

## Filtering Deleted Records

### In Queries

**Local (Drizzle):**

```typescript
// Get only active pins
const activePins = await db
  .select()
  .from(pins)
  .where(isNull(pins.deletedAt)) // ✅ Filter out deleted
  .all();
```

**Remote (Supabase):**

```typescript
// Sync only active records
const { data } = await supabase.from('pins').select('*').is('deleted_at', null); // ✅ Filter out deleted
```

**UI Hook (`usePins.ts`):**

```typescript
const { data: pins } = useQuery({
  queryKey: ['pins'],
  queryFn: async () => {
    const allPins = await db.select().from(pins).all();
    // Filter out soft-deleted pins
    return allPins.filter((pin) => !pin.deletedAt); // ✅
  },
});
```

---

## Sync Flow

### Delete Operation Flow

```
1. User taps delete button
   ↓
2. PinService.deletePin()
   - Sets deletedAt = NOW
   - Sets status = 'dirty'
   - Updates updatedAt = NOW
   ↓
3. Save to local SQLite
   - Pin still in database
   - Marked with deletedAt timestamp
   ↓
4. Enqueue for sync
   - Operation: 'delete'
   - EntityType: 'pin'
   - Data: { id, deletedAt, updatedAt }
   ↓
5. Queue processes operation
   - Calls PinsAPI.deletePin(id)
   ↓
6. Update Supabase
   - UPDATE pins SET deleted_at = NOW
   - Record persists with deleted_at set
   ↓
7. Other devices sync
   - See deleted_at timestamp
   - Mark local records as deleted
   ✅ All devices in sync!
```

---

## Cleanup Strategy

### Option 1: Never Delete (Recommended)

**Pros:**

- Complete audit trail
- Can restore anything
- Disk space is cheap

**Cons:**

- Database grows over time
- Queries need to filter deleted records

### Option 2: Scheduled Cleanup

**Delete records after N days:**

```typescript
// Run monthly via cron job
async function cleanupOldDeletes() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90); // 90 days ago

  await supabase
    .from('pins')
    .delete()
    .lt('deleted_at', cutoff.toISOString())
    .not('deleted_at', 'is', null); // Only delete soft-deleted records
}
```

### Option 3: Archive Table

**Move to archive instead of cleanup:**

```sql
-- Archive old deleted records
INSERT INTO pins_archive
SELECT * FROM pins
WHERE deleted_at < NOW() - INTERVAL '90 days';

DELETE FROM pins
WHERE deleted_at < NOW() - INTERVAL '90 days';
```

---

## Performance Considerations

### Index for Performance

```sql
-- Add index on deleted_at for fast filtering
CREATE INDEX idx_pins_deleted_at ON pins(deleted_at);

-- Partial index for active records only
CREATE INDEX idx_pins_active ON pins(id) WHERE deleted_at IS NULL;
```

### Query Optimization

```typescript
// ❌ Slow: Scans all records
const pins = await db.select().from(pins).all();
const active = pins.filter((p) => !p.deletedAt);

// ✅ Fast: Filters at database level
const active = await db.select().from(pins).where(isNull(pins.deletedAt)).all();
```

---

## Migration Notes

### If Switching from Hard Delete

**Step 1: Add deleted_at column** (Already done ✅)

```sql
ALTER TABLE pins ADD COLUMN deleted_at TIMESTAMP;
```

**Step 2: Update delete logic** (Just completed ✅)

```typescript
// Changed from:
await supabase.from('pins').delete().eq('id', pinId);

// To:
await supabase.from('pins').update({ deleted_at: NOW }).eq('id', pinId);
```

**Step 3: Update queries** (Already done ✅)

```typescript
// Add .is('deleted_at', null) to all queries
```

---

## Testing Soft Deletes

### Test Scenario 1: Basic Delete

```typescript
// 1. Create pin
const pin = await createPin({ name: 'Test' });

// 2. Delete pin
await deletePin(pin.id);

// 3. Verify still in database
const allPins = await db.select().from(pins).all();
expect(allPins.find((p) => p.id === pin.id)).toBeDefined();

// 4. Verify has deleted_at
expect(allPins.find((p) => p.id === pin.id)?.deletedAt).toBeTruthy();

// 5. Verify filtered from active list
const activePins = await getActivePins();
expect(activePins.find((p) => p.id === pin.id)).toBeUndefined();
```

### Test Scenario 2: Multi-Device Sync

```typescript
// Device A: Delete pin
await deviceA.deletePin(pinId);

// Device B: Sync
await deviceB.sync();

// Device B: Verify pin marked as deleted
const pin = await deviceB.getPin(pinId);
expect(pin.deletedAt).toBeTruthy();
```

---

## Summary

### Current Implementation ✅

- ✅ Local SQLite has `deletedAt` column
- ✅ Remote Supabase has `deleted_at` column
- ✅ PinService uses soft delete
- ✅ Queue syncs soft deletes to Supabase
- ✅ Queries filter out deleted records
- ✅ Sync handles deleted_at timestamps

### Benefits ✅

- ✅ Multi-device sync works correctly
- ✅ No zombie records
- ✅ Audit trail preserved
- ✅ Undo capability available
- ✅ Conflict resolution improved
- ✅ Data integrity maintained

### Trade-offs

- ⚠️ Database grows larger (minimal with proper indexing)
- ⚠️ Queries need to filter deleted records (automated)
- ✅ Benefits far outweigh costs

---

## Related Files

- `db/schema.ts` - Local schema with deletedAt
- `apis/Pins/index.ts` - Remote soft delete API
- `apis/Forms/index.ts` - Remote soft delete API
- `features/pins/services/PinService.ts` - Local soft delete logic
- `services/sync/queue/SyncQueueManager.ts` - Queue sync logic
- `utils/database.types.ts` - Supabase schema with deleted_at

**Pattern is consistent across the entire app! ✅**
