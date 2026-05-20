/**
 * Maps between client models (camelCase, `id` on the object) and Supabase rows.
 * Rows use snake_case columns; nested objects/arrays stay JSON-compatible.
 */

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);
}

function keysToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = k === "id" ? "id" : camelToSnake(k);
    if (isPlainObject(v)) {
      out[key] = keysToSnake(v);
    } else if (Array.isArray(v)) {
      out[key] = v.map((item) => (isPlainObject(item) ? keysToSnake(item) : item));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function keysToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = k === "id" ? "id" : snakeToCamel(k);
    if (isPlainObject(v)) {
      out[key] = keysToCamel(v);
    } else if (Array.isArray(v)) {
      out[key] = v.map((item) => (isPlainObject(item) ? keysToCamel(item) : item));
    } else {
      out[key] = v;
    }
  }
  return out;
}

/** Client model → row for insert/upsert/update. */
export function toRow<T extends { id: string }>(model: T): Record<string, unknown> {
  return keysToSnake(model as T & Record<string, unknown>);
}

/** Supabase row → client model. */
export function fromRow<T extends { id: string }>(row: Record<string, unknown> | null): T | null {
  if (!row) return null;
  return keysToCamel(row) as T;
}
