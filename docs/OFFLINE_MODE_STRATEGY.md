# Offline Mode Strategy

## 🎯 The Challenge

You asked: **"If I use usePins via webhooks, how does it handle offline mode?"**

This is the right question! Here's the complete answer.

---

## 📊 Current System Comparison

### Old System (pinService + Sync Queue)

```
✅ Works offline
✅ Queues changes locally
✅ Persists across app restarts
✅ Auto-syncs when online
❌ No real-time sync
❌ No conflict detection
❌ Manual cache management
❌ Complex sync logic
```

### New System (React Query Hooks + WebSocket)

```
✅ Real-time sync when online
✅ Automatic cache management
✅ Optimistic updates
✅ Conflict detection
✅ Clean, simple API
⚠️  Works offline BUT...
❌ Mutations don't persist across app restarts
❌ No automatic queue replay
```

---

## ✅ Recommended Solution: Hybrid Approach

### **Strategy: Keep Both Systems Working Together**

Use the strengths of both:

1. **New hooks for reads** → Real-time data, automatic cache
2. **Old pinService for writes** → Persistent offline queue

```tsx
// Example: Creating a pin offline-safe

import { usePins } from '~/hooks/usePins';
import { pinService } from '~/services/sync/pinService'; // Your existing service

function PinScreen() {
  // Read with new hooks (real-time sync)
  const { data: pins } = usePins();

  // Write with old service (offline queue)
  const handleCreatePin = async (data) => {
    // This queues offline and syncs when online
    await pinService.createPin(data);

    // Manually invalidate cache to show update
    queryClient.invalidateQueries(['pins']);
  };

  return <PinList pins={pins} onCreate={handleCreatePin} />;
}
```

**Benefits:**

- ✅ Real-time updates when online (WebSocket)
- ✅ Offline queue persists (existing system)
- ✅ No data loss
- ✅ Gradual migration path
- ✅ Best of both worlds

---

## 🔄 How Each Mode Works

### **Online Mode:**

```
User creates pin
  ↓
pinService.createPin() → queues in sync service
  ↓
Sync service uploads to backend immediately
  ↓
Backend saves & publishes event
  ↓
WebSocket broadcasts to all devices
  ↓
useRealTimeSync() invalidates React Query cache
  ↓
usePins() refetches and updates UI
  ↓
All devices see change in real-time
```

### **Offline Mode:**

```
User creates pin
  ↓
pinService.createPin() → queues in SQLite
  ↓
Sync service detects no network
  ↓
Pin stays in local queue
  ↓
usePins() still reads from local DB (works!)
  ↓
[Network restored]
  ↓
Sync service auto-retries queued items
  ↓
Backend saves & broadcasts
  ↓
Other devices see update
```

### **Conflict Mode (2 devices offline, both edit same pin):**

```
Device A edits pin offline → local version 2
Device B edits pin offline → local version 2
  ↓
Both go online
  ↓
Device A syncs first → backend now version 2
Device B tries to sync → conflict detected (baseVersion mismatch)
  ↓
Backend returns 409 Conflict
  ↓
useUpdatePin() hook catches ConflictError
  ↓
Shows dialog: "Pin was modified by another user"
  ↓
Options: [Use Server Version] [Keep My Changes]
```

---

## 🛠️ Implementation Options

### **Option 1: Hybrid (Recommended Now)**

**Best for:** Production stability, gradual migration

```tsx
// features/pins/components/PinForm.tsx

import { usePins, useQueryClient } from '~/hooks/usePins';
import { pinService } from '~/services/sync/pinService';

export function PinForm() {
  const queryClient = useQueryClient();
  const { data: pins } = usePins(); // Real-time reads

  const handleSave = async (data: PinData) => {
    try {
      // Use old service for reliable offline queue
      const result = await pinService.createPin(data);

      // Manually trigger cache update
      queryClient.invalidateQueries(['pins']);

      Alert.alert('Success', 'Pin saved!');
    } catch (error) {
      Alert.alert('Offline', 'Changes will sync when online');
    }
  };

  return <Form onSubmit={handleSave} />;
}
```

**Migration Path:**

1. ✅ Start using `usePins()` for all reads → get real-time sync
2. ✅ Keep `pinService` for writes → keep offline queue
3. Later: Enhance mutations with persistent storage
4. Finally: Remove old pinService

---

### **Option 2: Full Migration with Persistent Queue**

**Best for:** Long-term, once proven stable

Add persistent mutation queue to React Query:

```tsx
// Install: @tanstack/react-query-persist-client

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE',
});

function QueryProvider({ children }) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      {children}
    </PersistQueryClientProvider>
  );
}
```

Then enhance mutations:

```tsx
// hooks/usePins.ts

export function useCreatePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPin,
    // Persist mutation in queue
    onMutate: async (newPin) => {
      // Save to local DB immediately
      await localDb.insert(pins).values(newPin);
    },
    // Retry when back online
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    networkMode: 'offlineFirst',
  });
}
```

---

## 📋 Recommended Action Plan

### **Phase 1: Hybrid Mode (Now)**

1. ✅ Update QueryProvider with offline config (done!)
2. ✅ Use `usePins()` for reading data
3. ✅ Keep `pinService` for creating/updating/deleting
4. ✅ Test offline → online → sync flow
5. ✅ Deploy to production

### **Phase 2: Enhanced Mutations (Later)**

1. Add `@tanstack/react-query-persist-client`
2. Implement persistent mutation queue
3. Migrate one write operation at a time
4. Test thoroughly offline

### **Phase 3: Full Migration (Future)**

1. Remove old pinService
2. All operations use new hooks
3. Simplified codebase

---

## 🧪 How to Test Offline Mode

### **Test 1: Create Offline**

```
1. Turn on Airplane Mode
2. Create a pin
3. Verify: Pin appears in UI
4. Turn off Airplane Mode
5. Verify: Pin syncs to backend
6. Verify: Other devices see the pin
```

### **Test 2: Edit Offline**

```
1. Turn on Airplane Mode
2. Edit existing pin
3. Turn off Airplane Mode
4. Verify: Changes sync
5. Verify: Version increments
```

### **Test 3: Conflict Resolution**

```
1. Device A & B both offline
2. Both edit same pin
3. Device A goes online → syncs first
4. Device B goes online → gets conflict
5. Verify: Conflict dialog appears
6. Choose "Use Server Version" or "Keep Changes"
```

### **Test 4: App Restart Offline**

```
1. Create pin offline
2. Close app (force quit)
3. Reopen app (still offline)
4. Verify: Pending changes still queued
5. Go online
6. Verify: Changes sync automatically
```

---

## 💡 Key Insights

### **React Query Offline Behavior:**

- ✅ Caches data in memory (survives network loss)
- ✅ Retries mutations automatically
- ✅ Works with optimistic updates
- ❌ Doesn't persist mutations across app restarts (by default)
- ❌ No built-in queue management

### **Why Hybrid Works:**

- Old system: Proven offline queue with SQLite persistence
- New system: Real-time sync with clean API
- Together: Best reliability + best UX

### **WebSocket Offline:**

- Automatically disconnects when offline
- Automatically reconnects when online
- No intervention needed
- Falls back to polling if WebSocket fails

---

## 🎯 Your Answer

**Q: "How does usePins handle offline mode?"**

**A:**

1. **Short-term:** Use hybrid approach
   - `usePins()` for reading (real-time)
   - `pinService` for writing (offline queue)
2. **Long-term:** Add persistent mutations

   - Install React Query persist plugin
   - Enhance hooks with local DB writes
   - Full offline support

3. **Current Status:**
   - ✅ QueryProvider configured for offline-first
   - ✅ Retries enabled
   - ✅ WebSocket handles reconnection
   - ⚠️ Mutations need persistent queue

**Recommendation:** Start with hybrid, migrate gradually. This gives you real-time sync benefits while keeping your proven offline system.

---

## 📚 Further Reading

- [React Query Offline Mode](https://tanstack.com/query/latest/docs/react/guides/offline)
- [React Query Persistence](https://tanstack.com/query/latest/docs/react/plugins/persistQueryClient)
- Your existing sync docs: `docs/FRONTEND_SIMPLIFICATION_GUIDE.md`

---

## ✅ Next Steps

Would you like me to:

1. **Implement hybrid mode in Map.tsx** → Mix new hooks (read) with old service (write)
2. **Add full persistence** → Install and configure persist plugin
3. **Just document for later** → You decide when to migrate

Let me know! 🚀
