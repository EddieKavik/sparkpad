export function safeJsonParse(str: string, fallback: any = null) {
  try {
    if (!str || typeof str !== 'string') return fallback;
    return JSON.parse(str);
  } catch {
    return fallback;
  }
} 