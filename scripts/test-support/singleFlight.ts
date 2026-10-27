export function createSingleFlight(onChange: () => void = () => {}) {
  let active: Promise<void> | null = null;
  return {
    isRunning: () => active !== null,
    run(operation: () => Promise<void>): Promise<void> {
      if (active) return active;
      active = Promise.resolve()
        .then(operation)
        .finally(() => {
          active = null;
          onChange();
        });
      onChange();
      return active;
    },
  };
}
