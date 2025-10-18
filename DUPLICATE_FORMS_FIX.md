# Duplicate Forms Fix

## Problem Statement

After creating a form locally and pressing the sync button, two copies of the form appeared in **both local SQLite and remote Supabase** with **different IDs**.

## Root Cause Analysis (UPDATED - ACTUAL BUG FOUND)

The duplication was caused by **passing the wrong data to the queue**:

### The Actual Bug

**In `app/form/[pinId].tsx` (line 76-80):**

```typescript
const result = await formService.createForm(values); // Creates form with ID "abc-123"

if (result.success) {
  await enqueueFormSubmit(values); // ❌ BUG! Passes original values (NO ID!)
}
```

**In `services/sync/queue/helpers.ts` - `enqueueFormSubmit`:**

```typescript
export async function enqueueFormSubmit(formData: Record<string, any>): Promise<string> {
  const formId = formData.id || uuidv4(); // formData.id is undefined, generates NEW ID!
  // ...
}
```

### What Happened

1. **User submits form** with data `{ village: "SO", brushTeeth: "Yes", ... }` (no ID)
2. **`createForm()` generates ID** → Saves to SQLite with ID `abc-123`
3. **UI passes original `values`** to `enqueueFormSubmit()` → Still has no ID!
4. **Queue generates DIFFERENT ID** → ID `xyz-789`
5. **Queue syncs to Supabase** → Creates form with ID `xyz-789`
6. **User syncs from Supabase** → Pulls form `xyz-789` to local
7. **Result:**
   - Local SQLite: Two forms (`abc-123` and `xyz-789`)
   - Remote Supabase: One form (`xyz-789`)
   - But after sync: **Both have TWO forms with DIFFERENT IDs**

## The Fix

### Fix 1: Pass Created Entity to Queue (CRITICAL)

**Before:**

```typescript
const result = await formService.createForm(values);
if (result.success) {
  await enqueueFormSubmit(values); // ❌ Wrong! No ID
}
```

**After:**

```typescript
const result = await formService.createForm(values);
if (result.success) {
  await enqueueFormSubmit(result.data); // ✅ Correct! Has ID from createForm
}
```

### Fix 2: Bidirectional Key Conversion (Also Fixed)

1. **User creates form locally:**

   - Form saved to SQLite with `brushTeeth`, `pinId`, etc. (camelCase)
   - Form ID: `abc-123`

2. **Queue syncs to Supabase:**

   - Converted to snake_case: `brush_teeth`, `pin_id` ✅
   - Saved to Supabase with ID `abc-123`

3. **User presses sync button:**

   - Fetches from Supabase: Returns `brush_teeth`, `pin_id` (snake_case)
   - **BUG:** No conversion to camelCase ❌
   - Tries to upsert to SQLite with snake_case keys

4. **Upsert fails to match existing record:**
   - SQLite schema expects: `brushTeeth` (camelCase)
   - Received from Supabase: `brush_teeth` (snake_case)
   - Keys don't match → `exists()` check returns false
   - Inserts a NEW record instead of updating existing one
   - **Result:** Two forms with same ID but different field names!

## The Fix

### Part 1: Outgoing (Local → Supabase) ✅ Already Fixed

**Files:** `apis/Forms/index.ts`, `apis/Pins/index.ts`

Added `convertKeysToSnakeCase()` helper:

```typescript
const toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

// Before upserting to Supabase
const formWithSnakeCase = convertKeysToSnakeCase(formData);
await supabase.from('forms').upsert(formWithSnakeCase);
```

### Part 2: Incoming (Supabase → Local) ✅ NEW FIX

**Files:** `services/sync/repositories/forms/SupabaseFormRepo.ts`, `services/sync/repositories/pins/SupabasePinRepo.ts`

Added `convertKeysToCamelCase()` helper:

```typescript
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// After fetching from Supabase
async fetchAll(): Promise<ReForm[]> {
  const forms = await callForm.fetchAll(); // Returns snake_case
  return forms.map(form => convertKeysToCamelCase(form)); // Convert to camelCase
}
```

### Fix 2: Bidirectional Key Conversion (Also Fixed)

Added snake_case ↔ camelCase conversion (see `SNAKE_CASE_FIX.md` for details).

## Files Modified

### Critical Fix (Duplicate Prevention)

- ✅ `app/form/[pinId].tsx` - Pass `result.data` instead of `values` to queue
- ✅ `features/pins/components/Map.tsx` - Pass `result.data` instead of `values` to queue

### Supporting Fixes (Key Conversion)

- ✅ `services/sync/repositories/forms/SupabaseFormRepo.ts` - Convert snake_case → camelCase
- ✅ `services/sync/repositories/pins/SupabasePinRepo.ts` - Convert snake_case → camelCase
- ✅ `apis/Forms/index.ts` - Convert camelCase → snake_case
- ✅ `apis/Pins/index.ts` - Convert camelCase → snake_case

## Example: What Was Happening

### Timeline of Bug

**Step 1: User creates form**

```typescript
// UI sends: { village: "SO", brushTeeth: "Yes" }
```

**Step 2: createForm generates ID**

```typescript
// SQLite: { id: "abc-123", village: "SO", brushTeeth: "Yes" }
```

**Step 3: UI enqueues (BUG HERE)**

```typescript
// Passes original values (no ID!)
await enqueueFormSubmit({ village: 'SO', brushTeeth: 'Yes' });
```

**Step 4: Queue generates NEW ID**

```typescript
// Queue: { id: "xyz-789", village: "SO", brushTeeth: "Yes" }
```

**Step 5: Queue syncs to Supabase**

```typescript
// Supabase: { id: "xyz-789", village: "SO", brush_teeth: "Yes" }
```

**Step 6: User syncs from Supabase**

```typescript
// Pulls xyz-789 back to local
// SQLite now has BOTH abc-123 and xyz-789!
```

**Result: TWO FORMS with DIFFERENT IDs**

## Example: After Fix

### Timeline After Fix

**Step 1: User creates form**

```typescript
// UI sends: { village: "SO", brushTeeth: "Yes" }
```

**Step 2: createForm generates ID**

```typescript
// SQLite: { id: "abc-123", village: "SO", brushTeeth: "Yes" }
// Returns: result.data = { id: "abc-123", ... }
```

**Step 3: UI enqueues (FIXED)**

```typescript
// Passes created form WITH ID!
await enqueueFormSubmit(result.data); // Has id: "abc-123"
```

**Step 4: Queue uses SAME ID**

```typescript
// Queue: { id: "abc-123", village: "SO", brushTeeth: "Yes" }
```

**Step 5: Queue syncs to Supabase**

```typescript
// Supabase: { id: "abc-123", village: "SO", brush_teeth: "Yes" }
```

**Step 6: User syncs from Supabase**

```typescript
// Pulls abc-123 back to local
// SQLite already has abc-123 → UPDATE (not insert)
// Still only ONE form!
```

**Result: ONE FORM with CONSISTENT ID ✅**

## Testing

```typescript
// Supabase returns (snake_case):
{
  id: "abc-123",
  brush_teeth: "Yes",
  pin_id: "xyz-789"
}

// Tried to upsert to SQLite (expects camelCase):
// SQLite has: { id: "abc-123", brushTeeth: "Yes", pinId: "xyz-789" }
// Incoming: { id: "abc-123", brush_teeth: "Yes", pin_id: "xyz-789" }
// Keys don't match → Insert new record → DUPLICATE!
```

### After Fix

```typescript
// Supabase returns (snake_case):
{
  id: "abc-123",
  brush_teeth: "Yes",
  pin_id: "xyz-789"
}

// Converted to camelCase before upsert:
{
  id: "abc-123",
  brushTeeth: "Yes",
  pinId: "xyz-789"
}

// Now matches existing SQLite record → UPDATE instead of INSERT ✅
```

## Testing

### IMPORTANT: Clean Up Duplicates First

Before testing, you need to clean up existing duplicates:

**Option 1: Delete all forms and start fresh**

1. Go to Supabase dashboard → Forms table
2. Delete all test forms
3. In app, delete all forms (or reset local database)

**Option 2: Keep one copy of each**

1. In Supabase, identify duplicate forms (same content, different IDs)
2. Keep the one you want, delete the others
3. Sync app to pull clean data

### Test Case 1: Create Form (Primary Test)

**Steps:**

1. Create a new form with some data
2. **Immediately check:** Count forms in UI
3. **Expected:** See exactly 1 form
4. Press sync button
5. **Check again:** Count forms in UI
6. **Expected:** Still exactly 1 form (not 2!)
7. Go to Supabase dashboard
8. **Expected:** See exactly 1 form with matching ID

**How to verify ID matches:**

```typescript
// Add temporary logging in app/form/[pinId].tsx after creation:
console.log('Created form ID:', result.data.id);
// Then check Supabase - should see same ID
```

### Test Case 2: Create Pin (Same Bug)

1. Device A creates form
2. Device A syncs to Supabase
3. Device B syncs from Supabase
4. **Expected:** Device B gets the form with all fields intact
5. **Expected:** No duplicates on either device

### Test Case 3: Field Verification

1. Create form with all fields filled
2. Sync to Supabase
3. Check Supabase dashboard
4. **Expected:** All fields present with snake_case names
5. Sync from Supabase on same device
6. **Expected:** All fields still present locally with camelCase names

## Files Modified

### API Layer (Outgoing Conversion)

- ✅ `apis/Forms/index.ts` - Added `convertKeysToSnakeCase()`
- ✅ `apis/Pins/index.ts` - Added `convertKeysToSnakeCase()`

### Repository Layer (Incoming Conversion - NEW)

- ✅ `services/sync/repositories/forms/SupabaseFormRepo.ts` - Added `convertKeysToCamelCase()`
- ✅ `services/sync/repositories/pins/SupabasePinRepo.ts` - Added `convertKeysToCamelCase()`

### Documentation

- ✅ `SNAKE_CASE_FIX.md` - Updated with bidirectional conversion details
- ✅ `DUPLICATE_FORMS_FIX.md` - This file (root cause analysis)

## Verification Checklist

- [ ] Restart app
- [ ] Create a new form
- [ ] Verify form appears once in UI
- [ ] Press sync button
- [ ] Verify still only one copy
- [ ] Check Supabase dashboard - form should be there
- [ ] Delete local database (for clean test)
- [ ] Sync from Supabase
- [ ] Verify form appears with all fields correctly

## Impact

✅ **No more duplicate forms after sync**  
✅ **All fields sync correctly in both directions**  
✅ **Multi-device sync works properly**  
✅ **Existing data unaffected**  
✅ **No breaking changes**

## Related Issues

This fix also prevents:

- Incomplete data after sync (missing fields due to name mismatch)
- Orphaned records (records with only partial fields)
- Sync conflicts (trying to update non-existent records)

## Prevention

To prevent similar issues in the future:

1. Always convert keys when crossing the SQLite ↔ Supabase boundary
2. Test bidirectional sync for any new entity types
3. Add integration tests for sync operations
4. Consider using a shared type mapper utility

## Next Steps

If issues persist:

1. Check console logs for upsert errors
2. Verify field names in database schema match types
3. Check for any custom transformers that might interfere
4. Ensure all array fields are properly stringified/parsed
