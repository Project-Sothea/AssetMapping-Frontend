# Image Manager Refactoring

**Date**: January 2025  
**Status**: ✅ Complete

## Overview

The `ImageManager` module has been completely refactored from a monolithic 435-line file into a modular, well-architected system following SOLID principles and SLAP (Single Level of Abstraction Principle).

## Architecture

### Before (Monolithic)

```
ImageManager.ts (435 lines)
├─ Image picking logic
├─ Local storage operations
├─ Remote storage operations
├─ Sync coordination
├─ Utility functions
└─ Mixed abstraction levels
```

**Problems:**

- ❌ Multiple responsibilities in one file
- ❌ Tight coupling to FileSystem and Supabase
- ❌ Mixed abstraction levels (low-level file ops + high-level sync)
- ❌ Difficult to test individual components
- ❌ Hard to maintain and extend

### After (Modular)

```
services/sync/logic/images/
├─ ImageManager.ts (104 lines) - FACADE
├─ ImagePickerService.ts (72 lines) - UI interaction
├─ LocalImageStorage.ts (324 lines) - Local storage
├─ RemoteImageStorage.ts (160 lines) - Remote storage
├─ ImageSyncCoordinator.ts (191 lines) - Sync orchestration
└─ imageUtils.ts (99 lines) - Pure utilities
```

**Benefits:**

- ✅ Single Responsibility Principle (SRP)
- ✅ Single Level of Abstraction Principle (SLAP)
- ✅ Loose coupling via dependency injection
- ✅ Each service is independently testable
- ✅ Clear separation of concerns
- ✅ Easy to extend and maintain

## Module Details

### 1. ImageManager.ts (Facade)

**Responsibility:** Provide clean public API for all image operations

**Principle:** Facade Pattern - simple interface hiding complex subsystem

**Functions:**

- `getPickedImage()` - Pick image from gallery
- `saveToFileSystem()` - Save images to local storage
- `updateImagesLocally()` - Update local images
- `uploadToRemote()` - Upload to Supabase
- `handleUpsertsToLocal()` - Sync remote → local
- `handleUpsertsToRemote()` - Sync local → remote

**Usage:**

```typescript
import * as ImageManager from '~/services/sync/logic/images/ImageManager';

// All operations go through the facade
const result = await ImageManager.saveToFileSystem(pinId, images);
```

### 2. ImagePickerService.ts

**Responsibility:** Handle user image selection from device gallery

**SRP:** Only UI interaction for image picking

**Pattern:** Singleton

**Key Method:**

```typescript
async pickImage(): Promise<ImagePickResult>
```

**Features:**

- Permission handling
- Image quality configuration
- Error handling
- Returns structured result: `{ data: uri | null, error: Error | null }`

### 3. LocalImageStorage.ts

**Responsibility:** Manage all local file system operations

**SRP:** Only local storage management

**Pattern:** Singleton

**Key Methods:**

```typescript
async saveImages(pinId: string, images: string[]): Promise<SaveResult>
async updateImages(pinId: string, newImages: string[], existingLocalUris: string[]): Promise<UpdateResult>
async listImages(pinId: string): Promise<string[]>
async deleteImages(pinId: string, files: string[]): Promise<DeleteResult>
async downloadImages(pinId: string, remoteUrls: string[]): Promise<DownloadResult>
```

**Features:**

- Directory management
- File copying and downloading
- Idempotent operations
- Comprehensive error handling
- Uses `imageUtils` for URI handling

### 4. RemoteImageStorage.ts

**Responsibility:** Manage all Supabase storage operations

**SRP:** Only remote storage management

**Pattern:** Singleton

**Key Methods:**

```typescript
async uploadImages(pinId: string, localUris: string[]): Promise<UploadResult>
async deleteImages(pinId: string, filenames: string[]): Promise<DeleteResult>
async listImages(pinId: string): Promise<string[]>
```

**Features:**

- Batch upload operations
- Error tracking per image
- Uses Supabase images API
- Maintains local URI tracking

### 5. ImageSyncCoordinator.ts

**Responsibility:** Orchestrate sync between local and remote storage

**SRP:** Only coordination logic, delegates actual storage operations

**Pattern:** Singleton

**Key Methods:**

```typescript
async syncToLocal(pins: Pin[]): Promise<ImageSyncResult[]>
async syncToRemote(pins: any[]): Promise<ImageSyncResult[]>
```

**Features:**

- Coordinates multi-step sync operations
- Handles both sync directions (local ↔ remote)
- Delegates storage operations to specialized services
- Returns detailed sync results

**Sync Flow (To Local):**

1. List existing local images
2. Parse remote images from pin data
3. Delete old local images
4. Download new remote images
5. Return sync result

**Sync Flow (To Remote):**

1. List existing remote images
2. Parse local images from pin data
3. Delete old remote images
4. Upload new local images
5. Return sync result

### 6. imageUtils.ts

**Responsibility:** Pure utility functions for image handling

**SRP:** Only stateless utility functions, no side effects

**Functions:**

```typescript
generateUniqueFilename(): string
normalizeFileUri(uri: string): string
extractFilename(uri: string): string | null
isRemoteUri(uri: string): boolean
isLocalUri(uri: string): boolean
buildPinImageDirectory(pinId: string): string
```

**Characteristics:**

- Pure functions (no side effects)
- No external dependencies
- Easily testable
- Reusable across modules

## SOLID Principles Applied

### Single Responsibility Principle (SRP) ✅

Each service has ONE reason to change:

- `ImagePickerService` - changes only when image picking UI logic changes
- `LocalImageStorage` - changes only when local storage logic changes
- `RemoteImageStorage` - changes only when remote storage logic changes
- `ImageSyncCoordinator` - changes only when sync coordination logic changes
- `imageUtils` - changes only when utility functions need updates

### Open/Closed Principle (OCP) ✅

- Services are open for extension (can add new methods)
- Closed for modification (existing methods are stable)
- New functionality can be added via new services

### Liskov Substitution Principle (LSP) ✅

- All services implement consistent interfaces
- Services can be mocked/replaced for testing
- Singleton instances can be swapped if needed

### Interface Segregation Principle (ISP) ✅

- Each service exposes only methods relevant to its responsibility
- No "fat interfaces" - clients use only what they need
- Clean separation of concerns

### Dependency Inversion Principle (DIP) ✅

- High-level `ImageManager` depends on abstractions (services)
- Low-level services (`LocalImageStorage`, `RemoteImageStorage`) are independent
- Services can be tested in isolation

## SLAP (Single Level of Abstraction Principle) ✅

### Before (Mixed Abstraction Levels)

```typescript
// High-level operation
export async function handleUpsertsToLocal(pins: Pin[]) {
  for (const pin of pins) {
    // LOW-LEVEL: Direct file system calls
    const folderPath = `${FileSystem.documentDirectory}pins/${pin.id}/`;
    const info = await FileSystem.getInfoAsync(folderPath);
    const files = await FileSystem.readDirectoryAsync(folderPath);

    // MEDIUM-LEVEL: Parsing logic
    const newUris = typeof pin.images === 'string' ? JSON.parse(pin.images) : pin.images;

    // LOW-LEVEL: More file operations
    await FileSystem.deleteAsync(uri, { idempotent: true });
    await FileSystem.downloadAsync(img, localUri);
  }
}
```

### After (Consistent Abstraction Levels)

```typescript
// HIGH-LEVEL: ImageManager (Facade)
export async function handleUpsertsToLocal(pins: Pin[]): Promise<ImageSyncResult[]> {
  return imageSyncCoordinator.syncToLocal(pins);
}

// MEDIUM-LEVEL: ImageSyncCoordinator
async syncToLocal(pins: Pin[]): Promise<ImageSyncResult[]> {
  for (const pin of pins) {
    const oldImages = await localImageStorage.listImages(pin.id);
    const newImages = this.parseImageArray(pin.images);
    await localImageStorage.deleteImages(pin.id, oldImages);
    const result = await localImageStorage.downloadImages(pin.id, newImages);
    // ... return result
  }
}

// LOW-LEVEL: LocalImageStorage
async downloadImages(pinId: string, remoteUrls: string[]): Promise<DownloadResult> {
  // File system operations only
  const directory = buildPinImageDirectory(pinId);
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  await FileSystem.downloadAsync(url, localUri);
  // ...
}
```

**Benefits:**

- Each layer operates at consistent abstraction level
- Easy to read and understand
- Easy to test each level independently
- Changes isolated to appropriate layer

## Migration Guide

### No Breaking Changes! ✅

The public API remains **identical**. All existing code continues to work:

```typescript
// Still works exactly the same
import * as ImageManager from '~/services/sync/logic/images/ImageManager';

const result = await ImageManager.getPickedImage();
const saved = await ImageManager.saveToFileSystem(pinId, images);
```

### Advanced Usage (Optional)

For advanced use cases, you can now use individual services:

```typescript
// Use individual services directly
import { localImageStorage } from '~/services/sync/logic/images';

const images = await localImageStorage.listImages(pinId);
```

## Testing Strategy

### Unit Tests (Per Service)

Each service can be tested independently:

```typescript
// Test ImagePickerService in isolation
describe('ImagePickerService', () => {
  it('should handle permissions correctly', async () => {
    // Test just permission logic
  });
});

// Test LocalImageStorage in isolation
describe('LocalImageStorage', () => {
  it('should save images to correct directory', async () => {
    // Test just local storage logic
  });
});
```

### Integration Tests

Test service interactions:

```typescript
describe('ImageSyncCoordinator', () => {
  it('should coordinate sync between local and remote', async () => {
    // Test coordination logic with mocked storage services
  });
});
```

### Mock-Friendly Architecture

All services use dependency injection:

```typescript
// Easy to mock for testing
const mockLocalStorage = {
  saveImages: jest.fn().mockResolvedValue({ success: [], fail: [] }),
  // ...
};
```

## Performance

### Before

- Large monolithic file loaded all at once
- Hard to optimize individual operations

### After

- Smaller modules loaded on demand
- Each service optimized independently
- Better code splitting potential

## Maintainability Improvements

### Code Organization

- **Before**: 435 lines in one file, hard to navigate
- **After**: 6 focused files, easy to find code

### Testing

- **Before**: Mock entire ImageManager, hard to test specific logic
- **After**: Test each service independently, clear test boundaries

### Debugging

- **Before**: Stack traces through one large file
- **After**: Clear stack traces showing which service failed

### Extension

- **Before**: Add code to already large file
- **After**: Create new service or extend existing one

## Future Enhancements

With the new architecture, these are now easy to add:

1. **Image Caching Service**

   - Add `ImageCacheService.ts`
   - Integrate with `LocalImageStorage`

2. **Image Optimization Service**

   - Add `ImageOptimizationService.ts`
   - Integrate with upload pipeline

3. **Progress Tracking**

   - Add progress callbacks to storage services
   - Emit events during upload/download

4. **Retry Logic**
   - Add `RetryService.ts`
   - Wrap upload/download operations

## Related Documentation

- [SOFT_DELETE_PATTERN.md](./SOFT_DELETE_PATTERN.md) - Soft delete implementation
- [CODE_QUALITY_GUIDELINES.md](./CODE_QUALITY_GUIDELINES.md) - General coding standards
- [REFACTORING.md](./REFACTORING.md) - Refactoring guidelines

## Conclusion

The ImageManager refactoring demonstrates best practices in software architecture:

✅ **SOLID Principles** - Clear responsibilities, loose coupling  
✅ **SLAP** - Consistent abstraction levels  
✅ **Clean Code** - Easy to read, understand, and maintain  
✅ **Testability** - Each component independently testable  
✅ **Extensibility** - Easy to add new features  
✅ **No Breaking Changes** - Backward compatible

This refactoring transforms a monolithic, hard-to-maintain module into a modular, well-architected system that will be much easier to work with in the future.
