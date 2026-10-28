export function createNavigationGate() {
  let locked = false;
  return {
    reset: () => {
      locked = false;
    },
    run: (action: () => void): boolean => {
      if (locked) return false;
      locked = true;
      try {
        action();
        return true;
      } catch (error) {
        locked = false;
        throw error;
      }
    },
  };
}
