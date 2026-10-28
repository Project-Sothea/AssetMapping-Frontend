import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { createNavigationGate } from '~/shared/utils/navigationGate';

export function useSingleNavigation() {
  const gate = useRef(createNavigationGate()).current;
  useFocusEffect(useCallback(() => gate.reset(), [gate]));
  return gate.run;
}
