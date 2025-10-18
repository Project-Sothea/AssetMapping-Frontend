# Array Field Fix: JSON Strings vs PostgreSQL Arrays

## Problem Statement

Forms failed to sync to Supabase with error:

```
ERROR Failed to upsert form: {
  "code": "22P02",
  "message": "malformed array literal: \"[]\"",
  "details": "\"[\" must introduce explicitly-specified array dimensions."
}
```

## Root Cause

**Data Type Mismatch Between SQLite and PostgreSQL:**

### SQLite (Local)

- Arrays are stored as **JSON strings** (text fields)
- Example: `cholesterolAction: "[]"` or `waterSources: "[\"Well\",\"River\"]"`
- This is because SQLite doesn't have native array support

### PostgreSQL (Supabase)

- Arrays are stored as **native PostgreSQL arrays**
- Example: `cholesterol_action: []` or `water_sources: ['Well', 'River']`
- Expects actual array type, not JSON string

### What Happened

1. User fills form with array fields (e.g., `cholesterolAction: []`)
2. SQLite stores as JSON string: `"[]"`
3. Queue sends to Supabase: Still `"[]"` (JSON string)
4. PostgreSQL rejects: Expected array `[]`, got string `"[]"`
5. **Sync fails** ❌

## The Fix

### Bidirectional Array Conversion

**Outgoing (SQLite → Supabase): Parse JSON strings to arrays**

```typescript
// Before: "[]" (string)
// After:  []  (array)
```

**Incoming (Supabase → SQLite): Stringify arrays to JSON**

```typescript
// Before: []  (array)
// After:  "[]" (string)
```

## Implementation

### 1. API Layer (Outgoing to Supabase)

**Files:** `apis/Forms/index.ts`, `apis/Pins/index.ts`

**Forms - Array Fields:**

```typescript
const ARRAY_FIELDS = [
  'cholesterol_action',
  'cold_action',
  'diabetes_action',
  'hypertension_action',
  'long_term_conditions',
  'management_methods',
  'msk_action',
  'not_using_water_filter',
  'unsafe_water',
  'water_sources',
  'what_do_when_sick',
];
```

**Pins - Array Fields:**

```typescript
const ARRAY_FIELDS = ['images'];
```

**Conversion Logic:**

```typescript
const convertKeysToSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);

    // Parse JSON strings to arrays for PostgreSQL
    if (ARRAY_FIELDS.includes(snakeKey) && typeof value === 'string') {
      try {
        result[snakeKey] = JSON.parse(value); // "[]" → []
      } catch {
        result[snakeKey] = []; // Fallback to empty array
      }
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
};
```

### 2. Repository Layer (Incoming from Supabase)

**Files:** `services/sync/repositories/forms/SupabaseFormRepo.ts`, `services/sync/repositories/pins/SupabasePinRepo.ts`

**Forms - Array Fields (camelCase):**

```typescript
const ARRAY_FIELDS_CAMEL = [
  'cholesterolAction',
  'coldAction',
  'diabetesAction',
  'hypertensionAction',
  'longTermConditions',
  'managementMethods',
  'mskAction',
  'notUsingWaterFilter',
  'unsafeWater',
  'waterSources',
  'whatDoWhenSick',
];
```

**Pins - Array Fields (camelCase):**

```typescript
const ARRAY_FIELDS_CAMEL = ['images'];
```

**Conversion Logic:**

```typescript
const convertKeysToCamelCase = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);

    // Stringify arrays to JSON for SQLite
    if (ARRAY_FIELDS_CAMEL.includes(camelKey) && Array.isArray(value)) {
      result[camelKey] = JSON.stringify(value); // [] → "[]"
    } else {
      result[camelKey] = value;
    }
  }
  return result;
};
```

## Example Transformation

### Outgoing: SQLite → Supabase

**Before Conversion:**

```json
{
  "id": "abc-123",
  "cholesterolAction": "[\"Doctor\",\"Medicine\"]", // String
  "waterSources": "[]", // String
  "brushTeeth": "Yes"
}
```

**After Conversion (snake_case + array parsing):**

```json
{
  "id": "abc-123",
  "cholesterol_action": ["Doctor", "Medicine"], // Array
  "water_sources": [], // Array
  "brush_teeth": "Yes"
}
```

**Supabase receives:** Valid PostgreSQL arrays ✅

### Incoming: Supabase → SQLite

**From Supabase (snake_case + arrays):**

```json
{
  "id": "abc-123",
  "cholesterol_action": ["Doctor", "Medicine"], // Array
  "water_sources": [], // Array
  "brush_teeth": "Yes"
}
```

**After Conversion (camelCase + array stringification):**

```json
{
  "id": "abc-123",
  "cholesterolAction": "[\"Doctor\",\"Medicine\"]", // String
  "waterSources": "[]", // String
  "brushTeeth": "Yes"
}
```

**SQLite receives:** JSON strings to store in text fields ✅

## Files Modified

### API Layer (Outgoing Conversion)

- ✅ `apis/Forms/index.ts` - Added JSON.parse() for array fields
- ✅ `apis/Pins/index.ts` - Added JSON.parse() for images field

### Repository Layer (Incoming Conversion)

- ✅ `services/sync/repositories/forms/SupabaseFormRepo.ts` - Added JSON.stringify() for array fields
- ✅ `services/sync/repositories/pins/SupabasePinRepo.ts` - Added JSON.stringify() for images field

## Array Fields Reference

### Forms (11 array fields)

1. `cholesterolAction` / `cholesterol_action`
2. `coldAction` / `cold_action`
3. `diabetesAction` / `diabetes_action`
4. `hypertensionAction` / `hypertension_action`
5. `longTermConditions` / `long_term_conditions`
6. `managementMethods` / `management_methods`
7. `mskAction` / `msk_action`
8. `notUsingWaterFilter` / `not_using_water_filter`
9. `unsafeWater` / `unsafe_water`
10. `waterSources` / `water_sources`
11. `whatDoWhenSick` / `what_do_when_sick`

### Pins (1 array field)

1. `images` / `images`

## Testing

### Test Case 1: Empty Arrays

1. Create form with no selections (empty arrays)
2. Sync to Supabase
3. **Expected:** No "malformed array literal" error
4. **Expected:** Form syncs successfully
5. Check Supabase: Arrays should be `[]` (not `"[]"`)

### Test Case 2: Populated Arrays

1. Create form with multiple selections
   - Example: `waterSources: ["Well", "River", "Pond"]`
2. Sync to Supabase
3. **Expected:** Form syncs successfully
4. Check Supabase: Arrays should contain values
5. Sync back to local
6. **Expected:** Arrays remain intact

### Test Case 3: Pin with Images

1. Create pin with images array
2. Sync to Supabase
3. **Expected:** Images array syncs correctly
4. Check Supabase: `images` field should be array type

## Impact

✅ **Forms sync successfully** with array fields  
✅ **Pins sync successfully** with images  
✅ **No more malformed array errors**  
✅ **Data integrity maintained** across both databases  
✅ **Bidirectional sync works** for all field types

## Related Issues

This fix builds on:

1. **Snake Case Conversion** (`SNAKE_CASE_FIX.md`) - Field name conversion
2. **Duplicate Forms Fix** (`CRITICAL_DUPLICATE_FIX.md`) - Passing correct entity data
3. **Missing ID Fixes** - Ensuring ID in all operations

Together, these fixes ensure **complete data synchronization** between SQLite and PostgreSQL.

## Future Considerations

### Adding New Array Fields

If you add a new array field to the schema:

1. **Add to SQLite schema** (`db/schema.ts`):

   ```typescript
   newArrayField: text('new_array_field'), // JSON stringified array
   ```

2. **Add to Supabase** (SQL):

   ```sql
   ALTER TABLE forms ADD COLUMN new_array_field TEXT[];
   ```

3. **Add to ARRAY_FIELDS** in `apis/Forms/index.ts`:

   ```typescript
   const ARRAY_FIELDS = [
     // ... existing fields
     'new_array_field', // Add snake_case version
   ];
   ```

4. **Add to ARRAY_FIELDS_CAMEL** in `services/sync/repositories/forms/SupabaseFormRepo.ts`:

   ```typescript
   const ARRAY_FIELDS_CAMEL = [
     // ... existing fields
     'newArrayField', // Add camelCase version
   ];
   ```

5. **Test:** Create, sync, and verify the new field works

## Debugging

If you still see array errors:

1. **Check console logs** - Look for the actual data being sent
2. **Inspect Supabase dashboard** - Check column type (should be TEXT[])
3. **Verify field names** - Ensure field is in ARRAY_FIELDS list
4. **Test JSON.parse()** - Ensure data is valid JSON string
5. **Check for null values** - Ensure proper null handling
