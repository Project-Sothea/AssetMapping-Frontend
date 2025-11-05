import React, { useRef, ReactNode } from 'react';
import Swipeable from 'react-native-gesture-handler/Swipeable';

// Store the currently open swipeable
let currentlyOpenSwipeable: Swipeable | null = null;

// Export function to close any open swipeable
export const closeCurrentSwipeable = () => {
  if (currentlyOpenSwipeable) {
    currentlyOpenSwipeable.close();
    currentlyOpenSwipeable = null;
  }
};

type SwipeableCardProps = {
  children: ReactNode;
  renderRightActions?: () => ReactNode;
  renderLeftActions?: () => ReactNode;
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
  const swipeableRef = useRef<Swipeable>(null);

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
    <Swipeable
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
    </Swipeable>
  );
};
