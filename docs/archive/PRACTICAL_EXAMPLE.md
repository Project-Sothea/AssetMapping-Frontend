/**
 * PRACTICAL EXAMPLE: Using Queue Helpers in Your UI
 *
 * This shows how to update Map.tsx to use the queue system.
 * You have two options: Add alongside existing code, or replace it.
 */

// ==================== OPTION 1: Add Queue Alongside (Non-Breaking) ====================

// In features/pins/components/Map.tsx
// Add this import at the top:
import { enqueuePinCreate, enqueuePinUpdate, enqueuePinDelete } from '~/services/sync/queue';

// Then update your handlers:

// BEFORE:
const handlePinSubmit = async (values: any) => {
  if (!values.lat || !values.lng) {
    Alert.alert('Error creating pin');
    return;
  }

  const pinService = getPinService();
  const result = await pinService.createPin(values);

  if (result.success) {
    Alert.alert('Pin Created!');
    setModalVisible(false);
    setDroppedCoords(null);
  } else {
    ErrorHandler.showAlert(result.error, 'Failed to create pin');
  }
};

// AFTER (Option 1 - Add queue alongside):
const handlePinSubmit = async (values: any) => {
  if (!values.lat || !values.lng) {
    Alert.alert('Error creating pin');
    return;
  }

  const pinService = getPinService();
  const result = await pinService.createPin(values); // Still writes to local DB

  if (result.success) {
    // Also add to queue for backend sync
    await enqueuePinCreate(values);

    Alert.alert('Pin Created!');
    setModalVisible(false);
    setDroppedCoords(null);
  } else {
    ErrorHandler.showAlert(result.error, 'Failed to create pin');
  }
};

// ==================== OPTION 2: Replace with Queue (Future) ====================

// AFTER (Option 2 - Queue only):
const handlePinSubmit = async (values: any) => {
  if (!values.lat || !values.lng) {
    Alert.alert('Error creating pin');
    return;
  }

  try {
    // Just enqueue - queue will handle local DB + backend sync
    await enqueuePinCreate(values);

    Alert.alert('Pin Created!');
    setModalVisible(false);
    setDroppedCoords(null);
  } catch (error) {
    Alert.alert('Failed to create pin');
  }
};

// ==================== MORE EXAMPLES ====================

// Update Pin
const handlePinUpdate = async (values: any) => {
  if (!values.lat || !values.lng) {
    Alert.alert('Error updating pin');
    return;
  }

  const pinService = getPinService();
  const result = await pinService.updatePin(values.id, values);

  if (result.success) {
    // Add to queue
    await enqueuePinUpdate(values.id, values);

    Alert.alert('Pin Updated!');
    setDetailsVisible(false);
    setDroppedCoords(null);
  } else {
    ErrorHandler.showAlert(result.error, 'Failed to update pin');
  }
};

// Delete Pin
const handleDeletePin = async (pin: Pin) => {
  if (!pin.id) {
    Alert.alert('Error deleting pin');
    return;
  }

  const pinService = getPinService();
  const result = await pinService.deletePin(pin.id);

  if (result.success) {
    // Add to queue
    await enqueuePinDelete(pin.id);

    Alert.alert('Pin Deleted!');
    setDetailsVisible(false);
  } else {
    ErrorHandler.showAlert(result.error, 'Failed to delete pin');
  }
};

// ==================== MONITORING EXAMPLE ====================

// You can also monitor queue events in your component:

import { subscribeToQueueEvents } from '~/services/sync/queue';
import { useEffect } from 'react';

function MyComponent() {
  useEffect(() => {
    // Subscribe to queue events
    const unsubscribe = subscribeToQueueEvents((event) => {
      if (event.type === 'operation_completed') {
        console.log('Sync completed!');
      }
      if (event.type === 'operation_failed') {
        console.log('Sync failed, will retry');
      }
    });

    // Cleanup on unmount
    return () => unsubscribe();
  }, []);

  return <View>...</View>;
}

// ==================== MANUAL SYNC BUTTON ====================

// Add a "Sync Now" button in your UI:

import { processQueueNow } from '~/services/sync/queue';

function SyncButton() {
  const handleSync = async () => {
    try {
      await processQueueNow();
      Alert.alert('Sync Complete!');
    } catch (error) {
      Alert.alert('Sync Failed');
    }
  };

  return <Button onPress={handleSync}>Sync Now</Button>;
}

// ==================== QUEUE STATUS DISPLAY ====================

// Show queue health in your UI:

import { getQueueHealth } from '~/services/sync/queue';
import { useState, useEffect } from 'react';

function QueueStatus() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      const h = await getQueueHealth();
      setHealth(h);
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000); // Check every 5s

    return () => clearInterval(interval);
  }, []);

  if (!health) return null;

  return (
    <View>
      <Text>Pending: {health.pendingOperations}</Text>
      <Text>Failed: {health.failedOperations}</Text>
      {health.failedOperations > 0 && <Button onPress={retryFailedOperations}>Retry Failed</Button>}
    </View>
  );
}

// ==================== SUMMARY ====================

/*

THE HELPERS ARE JUST FUNCTIONS YOU IMPORT AND CALL!

Instead of:
  const queueManager = SyncQueueManager.getInstance();
  await queueManager.enqueue({ 
    operation: 'create',
    entityType: 'pin',
    entityId: pinId,
    data: pinData,
    timestamp: new Date().toISOString()
  });

You just do:
  import { enqueuePinCreate } from '~/services/sync/queue';
  await enqueuePinCreate(pinData);

Much simpler! The helpers wrap the complex queue manager logic.

*/
