import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

interface PopupState {
  message: string;
  color: string;
}

interface PopupContextType {
  showPopup: (message: string, color: string) => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
};

export const PopupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [popup, setPopup] = useState<PopupState | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hideTimeoutRef = useRef<number | null>(null);

  const showPopup = useCallback((message: string, color: string) => {
    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    setPopup({ message, color });
  }, []);

  useEffect(() => {
    if (popup) {
      // Reset animation value
      fadeAnim.setValue(0);

      // Start fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Schedule hide after delay
      hideTimeoutRef.current = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setPopup(null);
        });
      }, 1700); // 200ms fade in + 1500ms display
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [popup]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PopupContext.Provider value={{ showPopup }}>
      {children}
      {popup && (
        <Animated.View
          style={[
            styles.popup,
            {
              opacity: fadeAnim,
              backgroundColor: popup.color,
            },
          ]}>
          <Text style={styles.popupText}>{popup.message}</Text>
        </Animated.View>
      )}
    </PopupContext.Provider>
  );
};

const styles = StyleSheet.create({
  popup: {
    position: 'absolute',
    top: 100, // Below header
    left: '50%',
    transform: [{ translateX: -100 }],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    width: 200,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  popupText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
