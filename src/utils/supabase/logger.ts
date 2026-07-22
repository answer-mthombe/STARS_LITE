type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogPayload {
  requestId?: string;
  errorCode?: string;
  [key: string]: unknown;
}

// Keys that should always be scrubbed from logs
const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'secret', 'apikey', 'key'];

function sanitizeData(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function secureLog(
  level: LogLevel,
  message: string,
  payload: LogPayload = {},
  minimalMode = false
): void {
  // Drop to minimal logging if behind schedule or under heavy load
  if (minimalMode && (level === 'debug' || level === 'info')) {
    return;
  }

  const timestamp = new Date().toISOString();
  const requestId = payload.requestId || 'unknown-req';
  const errorCode = payload.errorCode || 'ERR_UNKNOWN';

  const cleanPayload = sanitizeData(payload) as Record<string, unknown>;

  const logEntry = {
    timestamp,
    level,
    message,
    requestId,
    errorCode,
    ...cleanPayload,
  };

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logEntry));
      break;
    case 'warn':
      console.warn(JSON.stringify(logEntry));
      break;
    case 'info':
    case 'debug':
    default:
      console.log(JSON.stringify(logEntry));
      break;
  }
}