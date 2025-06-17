import { localMemoryKV as civilMemoryKV } from './localMemoryKV';

const USERS_NAMESPACE = 'users';

export async function getAllUsers() {
  if (typeof civilMemoryKV.disk.listKeys === 'function') {
    const keys = await civilMemoryKV.disk.listKeys(USERS_NAMESPACE);
    const users = await Promise.all(
      keys.map(async (key: string) => {
        const data = await civilMemoryKV.disk.get(key);
        return data ? JSON.parse(data) : null;
      })
    );
    return users.filter(Boolean);
  }
  return [];
} 