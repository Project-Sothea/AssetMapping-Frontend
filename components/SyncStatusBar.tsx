import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { syncManagerInstance } from '~/services/sync/syncService';

export const SyncStatusBar = () => {
  const [status, setStatus] = useState(syncManagerInstance.getDisplayStatus());
  const [popup, setPopup] = useState<{ message: string; color: string } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = syncManagerInstance.subscribe(setStatus);
    return () => unsubscribe();
  }, []);

  const showPopup = (message: string, color: string) => {
    setPopup({ message, color });

    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setPopup(null));
      }, 1500);
    });
  };

  const handlePress = async () => {
    try {
      await syncManagerInstance.syncNow();
      showPopup('Sync successful!', 'green');
    } catch (err) {
      console.error('Manual sync failed:', err);
      showPopup('Sync failed!', 'red');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonWrapper}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.button,
            {
              borderColor: status.color,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              backgroundColor: pressed ? '#f0f0f0' : 'white',
            },
          ]}>
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.text || 'Sync Pins'}
          </Text>
        </Pressable>

        {popup && (
          <Animated.View
            style={[styles.popup, { opacity: fadeAnim, backgroundColor: popup.color }]}>
            <Text style={styles.popupText}>{popup.message}</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buttonWrapper: { position: 'relative', alignItems: 'center' },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: 'white',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statusText: { fontSize: 16, fontWeight: '600' },
  popup: {
    position: 'absolute',
    top: '100%', // just below the button
    marginTop: 8, // spacing
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    width: 150,
    alignItems: 'center',
    elevation: 5,
  },
  popupText: { color: 'white', fontWeight: '600', fontSize: 14 },
});
