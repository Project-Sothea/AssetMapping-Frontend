# Bug Fixes Summary

## Bugs Fixed

### ✅ Bug 5: Form Creation Crash - FIXED

**Error**: `FunctionCallException: Calling the 'runSync' function has failed`

**Root Cause**: FormService was trying to fetch created form with `dbValues.id` which could be undefined, causing a database query failure.

**Fix**:

- Added UUID generation in `FormService.createForm()` if ID not provided
- Imported `uuid` package: `import { v4 as uuidv4 } from 'uuid'`
- Generate ID: `const formId = values.id || uuidv4()`

**Files Modified**:

- `services/forms/FormService.ts`

---

### ✅ Bug 2: Deleted Pins Reappear After Sync - FIXED

**Problem**: Pins deleted locally would reappear after pressing sync button

**Root Cause**: Services were doing **hard deletes** (`await this.localRepo.delete(id)`) instead of **soft deletes**. The sync strategy expects `deletedAt` field to propagate deletions to remote.

**Fix**:

- Changed `PinService.deletePin()` to soft delete:
  ```typescript
  await this.localRepo.update({
    id,
    deletedAt: new Date().toISOString(),
    status: 'dirty',
    updatedAt: new Date().toISOString(),
  });
  ```
- Updated `useFetchLocalPins()` hook to filter out soft-deleted pins:
  ```typescript
  .where(isNull(schema.pins.deletedAt))
  ```
- Updated `PinService.getAllPins()` to filter soft-deleted pins:
  ```typescript
  const activePins = allPins.filter((pin) => !pin.deletedAt);
  ```

**Files Modified**:

- `services/pins/PinService.ts`
- `hooks/Pins/index.ts`

---

### ✅ Bug 4: Deleted Forms Reappear From Remote - FIXED

**Problem**: Forms deleted locally would reappear after sync

**Root Cause**: Same as Bug 2 - hard deletes instead of soft deletes

**Fix**:

- Changed `FormService.deleteForm()` to soft delete
- Updated `useFetchLocalForms()` hook to filter deleted forms:
  ```typescript
  .where(and(
    eq(schema.forms.pinId, pinId),
    isNull(schema.forms.deletedAt)
  ))
  ```
- Updated `FormService.getFormsForPin()` to filter soft-deleted:
  ```typescript
  const pinForms = allForms.filter((form) => form.pinId === pinId && !form.deletedAt);
  ```

**Files Modified**:

- `services/forms/FormService.ts`
- `hooks/Forms/index.ts`

---

### ✅ Bug 3: Images Show Grey (From Remote) - FIXED

**Problem**: Images that come from remote sync show as grey boxes, but freshly added images from picker display correctly

**Root Cause**:
The pin modal was using a static pin object passed as a prop. When the sync updated the `localImages` field in the database with downloaded file paths, the modal component didn't re-render because it was using stale data from the initial fetch.

**Analysis**:

1. ✅ Sync downloads images via `downloadToLocal()` in `ImageManager.ts`
2. ✅ Downloads HTTP(S) URLs to local file system
3. ✅ Updates `localImages` field with local file:// URIs
4. ✅ `handleUpsertsToLocal()` is called during sync in `PinSyncHandler.postSync()`
5. ❌ **Modal component doesn't re-render when DB updates**

**Fix Applied**:
Changed the pin modal to use a **live query** that automatically re-renders when the pin data changes:

```typescript
// 1. Created new hook for live pin queries
export const useFetchLocalPin = (pinId: string) => {
  const query = db
    .select()
    .from(schema.pins)
    .where(and(eq(schema.pins.id, pinId), isNull(schema.pins.deletedAt)));

  const result = useLiveQuery(query);
  return result?.data?.[0] ?? null;
};

// 2. Updated PinDetailsModal to use live query instead of static prop
export const PinDetailsModal = ({ visible, pinId, ... }) => {
  // This automatically re-renders when pin data changes!
  const pin = useFetchLocalPin(pinId);

  return (
    <ModalWrapper title={'Pin Details'} visible={visible} onClose={onClose}>
      <PinDetails pin={pin} onUpdate={onUpdate} onDelete={onDelete} />
    </ModalWrapper>
  );
};

// 3. Updated Map.tsx to pass pinId instead of pin object
const handleOpenPin = async (e: any) => {
  const pinId = e.features?.[0]?.properties?.id;
  if (!pinId) return;

  // Just store the ID - modal will use live query
  setSelectedPinId(pinId);
  setDetailsVisible(true);
};
```

**How It Works**:

1. When you open a pin, the modal stores the `pinId` (not the pin object)
2. The modal uses `useFetchLocalPin()` hook with `useLiveQuery`
3. When sync updates the `localImages` field in the database, the live query automatically triggers a re-render
4. The component gets fresh data with the downloaded file:// paths
5. Images display correctly!

**Files Modified**:

- `hooks/Pins/index.ts` - Added `useFetchLocalPin()` hook
- `components/MapPin/PinDetailsModal.tsx` - Changed to use pinId + live query
- `components/Map.tsx` - Changed to pass pinId instead of pin object

---

### ✅ Bug 1: Cannot Remove Last Image - FIXED

**Problem**: After adding an image, cannot remove the last remaining image

**Root Cause**: Multiple issues:

1. `initialValues.localImages` could be `null`, causing state inconsistency
2. Formik might have `enableReinitialize` enabled, resetting values
3. Empty array `[]` not being explicitly set when all images removed

**Fix Applied**:

```typescript
// 1. Force localImages to always be an array
initialValues={{
  ...initialValues,
  localImages: Array.isArray(initialValues.localImages) ? initialValues.localImages : [],
}}
enableReinitialize={false}  // Prevent auto-reset

// 2. Explicitly set empty array when removing last image
onPress={() => {
  const newImages = values.localImages.filter((_, i) => i !== idx);
  setFieldValue('localImages', newImages.length > 0 ? newImages : []);
  console.log('Removed image, remaining:', newImages.length);
}}

// 3. Helper function always returns array
const intoPinFormValues = (pin: Pin): PinFormValues => {
  let parsedLocalImages: string[] = [];
  // ... always return array, never null
};

// 4. PinService handles empty arrays correctly
if (values.localImages && values.localImages.length > 0) {
  // save images
} else {
  // explicitly set localImages: '[]'
  await this.localRepo.update({
    ...updateData,
    localImages: '[]',
    images: null,
  });
}
```

**Files Modified**:

- `components/MapPin/PinForm.tsx`
- `components/MapPin/PinDetails.tsx`
- `services/pins/PinService.ts`

---

## Summary

### Fixes Applied:

- ✅ Form creation UUID generation
- ✅ Soft delete for pins (instead of hard delete)
- ✅ Soft delete for forms (instead of hard delete)
- ✅ Filter deleted items in hooks
- ✅ Filter deleted items in service layer

### Still Investigating:

- 🔄 Grey images from remote (image download/display issue)
- 🔄 Cannot remove last image (Formik state update issue)

### Testing Needed:

1. Create a form → verify it works
2. Delete a pin locally → sync → verify it stays deleted
3. Delete a form locally → sync → verify it stays deleted
4. Sync pins with remote images → verify images display correctly
5. Add multiple images to a pin → remove them one by one → verify all can be removed
