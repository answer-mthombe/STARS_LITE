import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { secureLog } from './logger';

describe('Secure Logger Utility', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should sanitize sensitive keys like passwords and tokens recursively', () => {
    secureLog('info', 'User login attempt', {
      requestId: 'req-123',
      errorCode: 'NONE',
      password: 'super-secret-password',
      authToken: 'Bearer secret_token_xyz',
      nested: {
        apiKey: '12345-abcde',
        publicField: 'visible',
      },
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);

    expect(loggedData.password).toBe('[REDACTED]');
    expect(loggedData.authToken).toBe('[REDACTED]');
    expect(loggedData.nested.apiKey).toBe('[REDACTED]');
    expect(loggedData.nested.publicField).toBe('visible');
    expect(loggedData.requestId).toBe('req-123');
  });

  it('should suppress debug and info logs when minimalMode is true', () => {
    secureLog('info', 'Should be ignored', { requestId: 'req-456' }, true);
    secureLog('debug', 'Should also be ignored', { requestId: 'req-456' }, true);
    
    // Warnings and errors should still log in minimalMode
    secureLog('warn', 'Should be logged', { requestId: 'req-456' }, true);
    secureLog('error', 'Should be logged too', { requestId: 'req-456' }, true);

    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    const warnData = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
    expect(warnData.message).toBe('Should be logged');
  });

  it('should fallback to default request IDs and error codes if omitted', () => {
    secureLog('error', 'Critical failure without metadata', {});

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

    expect(loggedData.requestId).toBe('unknown-req');
    expect(loggedData.errorCode).toBe('ERR_UNKNOWN');
  });
});