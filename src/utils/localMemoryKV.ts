const store: Record<string, string> = {};

export const localMemoryKV = {
  disk: {
    async set(key: string, value: string) {
      store[key] = value;
    },
    async get(key: string) {
      return store[key] || null;
    },
    async delete(key: string) {
      delete store[key];
    },
    async listKeys(prefix: string) {
      return Object.keys(store).filter((k) => k.startsWith(prefix));
    },
  },
}; 