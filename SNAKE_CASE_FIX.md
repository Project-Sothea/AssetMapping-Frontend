# Snake Case Fix: Schema Naming Mismatch

## The Problem

Error when syncing form to Supabase:

```
ERROR  Failed to upsert form: {"code": "PGRST204", "details": null, "hint": null,
"message": "Could not find the 'brushTeeth' column of 'forms' in the schema cache"}
```

## Root Cause

**Naming Convention Mismatch:**

- **Local SQLite Schema**: Uses **camelCase** (JavaScript convention)
  - Example: `brushTeeth`, `pinId`, `cityVillage`
- **Supabase PostgreSQL Schema**: Uses **snake_case** (SQL convention)
  - Example: `brush_teeth`, `pin_id`, `city_village`

When the queue system sent data to Supabase, it used camelCase field names that didn't exist in the PostgreSQL schema.

## The Fix

Added automatic key conversion from camelCase → snake_case before sending to Supabase.

### Helper Functions

```typescript
/**
 * Convert camelCase keys to snake_case for Supabase
 * Local SQLite uses camelCase, Supabase uses snake_case
 */
const toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

const convertKeysToSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value;
  }
  return result;
};
```

### Updated Files

**1. `apis/Forms/index.ts`**

```typescript
export const upsertOne = async (form: ReForm) => {
  // ... strip local-only fields ...

  // Convert camelCase to snake_case for Supabase
  const formWithSnakeCase = convertKeysToSnakeCase(formToUpsert);

  const { error } = await supabase.from('forms').upsert(formWithSnakeCase, { onConflict: 'id' });
};
```

**2. `apis/Pins/index.ts`**

```typescript
export const upsertOne = async (pin: RePin) => {
  // ... strip local-only fields ...

  // Convert camelCase to snake_case for Supabase
  const pinWithSnakeCase = convertKeysToSnakeCase(pinToUpsert);

  const { error } = await supabase.from('pins').upsert(pinWithSnakeCase, { onConflict: 'id' });
};
```

## Example Transformation

**Before (camelCase - SQLite):**

```json
{
  "id": "5f72ab5a-8597-4da2-9cea-bbcff993d2b7",
  "pinId": "2f2a85f4-e14c-4f90-bc8a-52f98b0aa1d6",
  "brushTeeth": "Yes",
  "coldAction": ["Rest", "Medicine"],
  "villageId": "SO",
  "updatedAt": "2025-10-18T12:00:00.000Z"
}
```

**After (snake_case - Supabase):**

```json
{
  "id": "5f72ab5a-8597-4da2-9cea-bbcff993d2b7",
  "pin_id": "2f2a85f4-e14c-4f90-bc8a-52f98b0aa1d6",
  "brush_teeth": "Yes",
  "cold_action": ["Rest", "Medicine"],
  "village_id": "SO",
  "updated_at": "2025-10-18T12:00:00.000Z"
}
```

## Why Two Different Conventions?

1. **SQLite (camelCase)**:

   - Used in React Native/TypeScript code
   - Follows JavaScript naming conventions
   - Better developer experience in the app
   - Drizzle ORM schema uses camelCase

2. **PostgreSQL (snake_case)**:
   - SQL convention (standard for databases)
   - Supabase follows PostgreSQL best practices
   - Better compatibility with SQL tools
   - Case-insensitive queries

## Bidirectional Conversion

The fix implements conversion in **both directions**:

### 1. Local → Supabase (camelCase → snake_case)

**Files:** `apis/Forms/index.ts`, `apis/Pins/index.ts`

```typescript
// Before sending to Supabase
const dataWithSnakeCase = convertKeysToSnakeCase(formData);
await supabase.from('forms').upsert(dataWithSnakeCase);
```

### 2. Supabase → Local (snake_case → camelCase)

**Files:** `services/sync/repositories/forms/SupabaseFormRepo.ts`, `services/sync/repositories/pins/SupabasePinRepo.ts`

```typescript
// After fetching from Supabase
async fetchAll(): Promise<ReForm[]> {
  const forms = await callForm.fetchAll(); // Returns snake_case
  return forms.map(form => convertKeysToCamelCase(form)); // Convert to camelCase
}
```

## Impact

✅ **Forms**: All form operations now convert keys in both directions
✅ **Pins**: All pin operations now convert keys in both directions
✅ **Queue System**: Works transparently - no changes needed
✅ **Backward Compatible**: Existing code continues to work
✅ **Sync Fixed**: No more duplicate forms when syncing from Supabase

## Common Issues Fixed

### Issue 1: "Could not find column" Error

**Symptom:** `ERROR Failed to upsert form: Could not find the 'brushTeeth' column`  
**Cause:** Sending camelCase keys to Supabase (expects snake_case)  
**Fix:** `convertKeysToSnakeCase()` in API layer before upserting

### Issue 2: Duplicate Forms After Sync

**Symptom:** Two copies of same form appear after pressing sync  
**Cause:** Fetching snake_case from Supabase, trying to upsert to camelCase SQLite fails to match existing records  
**Fix:** `convertKeysToCamelCase()` in repository layer after fetching

### Issue 3: Missing Data After Sync

**Symptom:** Forms synced to Supabase but fields appear empty locally  
**Cause:** Field names don't match when syncing back (e.g., `brush_teeth` vs `brushTeeth`)  
**Fix:** Both conversion helpers ensure field names always match

## Testing

After this fix, you should see:

```
LOG  [Supabase] Syncing form: create 5f72ab5a-8597-4da2-9cea-bbcff993d2b7
LOG  ✓ Completed: CREATE form:5f72ab5a
```

Instead of:

```
ERROR Failed to upsert form: Could not find the 'brushTeeth' column
```

## Related Files

**API Layer (Local → Supabase):**

- `apis/Forms/index.ts` - Form sync with snake_case conversion (outgoing)
- `apis/Pins/index.ts` - Pin sync with snake_case conversion (outgoing)

**Repository Layer (Supabase → Local):**

- `services/sync/repositories/forms/SupabaseFormRepo.ts` - camelCase conversion (incoming)
- `services/sync/repositories/pins/SupabasePinRepo.ts` - camelCase conversion (incoming)

**Schema Definitions:**

- `db/schema.ts` - Local SQLite schema (camelCase)
- `utils/database.types.ts` - Supabase types (snake_case)

## Future Considerations

If you add new fields:

1. **SQLite schema**: Use camelCase in `db/schema.ts`
2. **Supabase schema**: Use snake_case in Supabase dashboard
3. **The conversion is automatic** - no manual mapping needed!

Example:

- SQLite: `hasHealthInsurance: text('has_health_insurance')`
- Supabase: `has_health_insurance TEXT`
- Conversion handles it automatically ✅
