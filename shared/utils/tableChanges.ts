// Collapse a burst of row notifications into one refresh per table per scheduling window.
export function createTableChangeBatcher(schedule: (flush: () => void) => void) {
  const listeners = new Map<string, Set<() => void>>();
  const dirty = new Set<string>();
  let scheduled = false;
  return {
    subscribe(table: string, listener: () => void) {
      const group = listeners.get(table) ?? new Set();
      group.add(listener);
      listeners.set(table, group);
      return () => {
        group.delete(listener);
        if (!group.size) listeners.delete(table);
      };
    },
    changed(table: string) {
      if (!listeners.has(table)) return;
      dirty.add(table);
      if (scheduled) return;
      scheduled = true;
      schedule(() => {
        scheduled = false;
        const tables = [...dirty];
        dirty.clear();
        for (const name of tables) for (const listener of listeners.get(name) ?? []) listener();
      });
    },
  };
}
