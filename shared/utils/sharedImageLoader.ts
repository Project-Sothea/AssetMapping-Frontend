type ImageDependencies = {
  exists(pinId: string, filename: string): boolean;
  local(pinId: string, filename: string): string;
  remote(pinId: string, filename: string): Promise<string | null>;
  cache(pinId: string, filename: string, url: string): Promise<string | null>;
};

// Bound network/file work across all visible cards and share identical requests.
export function createSharedImageLoader(deps: ImageDependencies, limit = 4) {
  const pending = new Map<string, Promise<string | null>>();
  const waiting: (() => void)[] = [];
  let active = 0;
  async function slot<T>(work: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    else active++;
    try {
      return await work();
    } finally {
      const next = waiting.shift();
      if (next)
        next(); // Transfer this slot directly to the queued job.
      else active--;
    }
  }
  return (pinId: string, filename: string, forceRemote = false): Promise<string | null> => {
    if (!pinId || !filename) return Promise.resolve(null);
    if (!forceRemote && deps.exists(pinId, filename))
      return Promise.resolve(deps.local(pinId, filename));
    const key = JSON.stringify([pinId, filename]);
    const existing = pending.get(key);
    if (existing) return existing;
    const request = slot(async () => {
      const url = await deps.remote(pinId, filename);
      if (!url) return null;
      return (await deps.cache(pinId, filename, url)) || url;
    }).finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
  };
}
