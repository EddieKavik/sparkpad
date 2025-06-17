import { localMemoryKV as civilMemoryKV } from './localMemoryKV';

// Utility to generate a unique key (UUID or similar)
function generateId() {
  return crypto.randomUUID();
}

// Namespace constants
const DIRECTIVES = 'directives';
const TARGET_GROUPS = 'target_groups';
const USER_RECEIVED_DIRECTIVES = 'user_received_directives';
const BROADCAST_LOGS = 'broadcast_logs';

// --- Directives ---
export async function putDirective(directive: Record<string, unknown>) {
  const id = directive.id || generateId();
  directive.id = id;
  await civilMemoryKV.disk.set(`${DIRECTIVES}#${id}`, JSON.stringify(directive));
  return directive;
}

export async function getDirective(id: string) {
  const data = await civilMemoryKV.disk.get(`${DIRECTIVES}#${id}`);
  return data ? JSON.parse(data) : null;
}

// List all directives (placeholder: returns empty array if not supported)
export async function listDirectives() {
  if (typeof civilMemoryKV.disk.listKeys === 'function') {
    const keys = await civilMemoryKV.disk.listKeys(DIRECTIVES);
    const directives = await Promise.all(
      keys.map(async (key: string) => {
        const data = await civilMemoryKV.disk.get(key);
        return data ? JSON.parse(data) : null;
      })
    );
    return directives.filter(Boolean);
  }
  // If listKeys is not available, return empty array
  return [];
}

// --- Target Groups ---
export async function putTargetGroup(group: Record<string, unknown>) {
  const id = group.id || generateId();
  group.id = id;
  await civilMemoryKV.disk.set(`${TARGET_GROUPS}#${id}`, JSON.stringify(group));
  return group;
}

export async function getTargetGroup(id: string) {
  const data = await civilMemoryKV.disk.get(`${TARGET_GROUPS}#${id}`);
  return data ? JSON.parse(data) : null;
}

// List all target groups (placeholder: returns empty array if not supported)
export async function listTargetGroups() {
  if (typeof civilMemoryKV.disk.listKeys === 'function') {
    const keys = await civilMemoryKV.disk.listKeys(TARGET_GROUPS);
    const groups = await Promise.all(
      keys.map(async (key: string) => {
        const data = await civilMemoryKV.disk.get(key);
        return data ? JSON.parse(data) : null;
      })
    );
    return groups.filter(Boolean);
  }
  // If listKeys is not available, return empty array
  return [];
}

// --- User Received Directives ---
export async function putUserReceivedDirective(obj: Record<string, unknown>) {
  const id = obj.id || generateId();
  obj.id = id;
  await civilMemoryKV.disk.set(`${USER_RECEIVED_DIRECTIVES}#${id}`, JSON.stringify(obj));
  return obj;
}

// List all user received directives for a user
export async function getAllUserReceivedDirectives(userId: string) {
  if (typeof civilMemoryKV.disk.listKeys === 'function') {
    const keys = await civilMemoryKV.disk.listKeys(USER_RECEIVED_DIRECTIVES);
    const directives = await Promise.all(
      keys.map(async (key: string) => {
        const data = await civilMemoryKV.disk.get(key);
        if (!data) return null;
        const obj = JSON.parse(data);
        return obj.user_id === userId ? obj : null;
      })
    );
    return directives.filter(Boolean);
  }
  return [];
}

// Update read status for a user received directive
export async function updateUserReceivedDirectiveReadStatus(id: string, read: boolean) {
  const key = `${USER_RECEIVED_DIRECTIVES}#${id}`;
  const data = await civilMemoryKV.disk.get(key);
  if (!data) return null;
  const obj = JSON.parse(data);
  obj.read_status = read;
  await civilMemoryKV.disk.set(key, JSON.stringify(obj));
  return obj;
}

// --- Broadcast Logs ---
export async function putBroadcastLog(log: Record<string, unknown>) {
  const id = log.id || generateId();
  log.id = id;
  await civilMemoryKV.disk.set(`${BROADCAST_LOGS}#${id}`, JSON.stringify(log));
  return log;
}

// List all broadcast logs
export async function listBroadcastLogs() {
  if (typeof civilMemoryKV.disk.listKeys === 'function') {
    const keys = await civilMemoryKV.disk.listKeys(BROADCAST_LOGS);
    const logs = await Promise.all(
      keys.map(async (key: string) => {
        const data = await civilMemoryKV.disk.get(key);
        return data ? JSON.parse(data) : null;
      })
    );
    return logs.filter(Boolean);
  }
  return [];
} 