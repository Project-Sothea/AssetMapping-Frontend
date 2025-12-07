import React, { useRef, ReactNode } from 'react';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SharedValue } from 'react-native-reanimated';

// Store the currently open swipeable
let currentlyOpenSwipeable: SwipeableMethods | null = null;

// Export function to close any open swipeable
export const closeCurrentSwipeable = () => {
  if (currentlyOpenSwipeable) {
    currentlyOpenSwipeable.close();
    currentlyOpenSwipeable = null;
  }
};

type SwipeableCardProps = {
  children: ReactNode;
  renderRightActions?: (
    progress: SharedValue<number>,
    translation: SharedValue<number>,
    swipeableMethods: SwipeableMethods
  ) => ReactNode;
  renderLeftActions?: (
    progress: SharedValue<number>,
    translation: SharedValue<number>,
    swipeableMethods: SwipeableMethods
  ) => ReactNode;
  overshootRight?: boolean;
  overshootLeft?: boolean;
  friction?: number;
  rightThreshold?: number;
  leftThreshold?: number;
};

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  renderRightActions,
  renderLeftActions,
  overshootRight = false,
  overshootLeft = false,
  friction = 2,
  rightThreshold = 40,
  leftThreshold = 40,
}) => {
  const swipeableRef = useRef<SwipeableMethods | null>(null);

  const handleSwipeableWillOpen = () => {
    // Close the previously open swipeable immediately when a new one starts to open
    if (currentlyOpenSwipeable && currentlyOpenSwipeable !== swipeableRef.current) {
      currentlyOpenSwipeable.close();
    }
  };

  const handleSwipeableOpen = () => {
    // Update the currently open swipeable
    currentlyOpenSwipeable = swipeableRef.current;
  };

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      onSwipeableWillOpen={handleSwipeableWillOpen}
      onSwipeableOpen={handleSwipeableOpen}
      overshootRight={overshootRight}
      overshootLeft={overshootLeft}
      friction={friction}
      rightThreshold={rightThreshold}
      leftThreshold={leftThreshold}>
      {children}
    </ReanimatedSwipeable>
  );
};
