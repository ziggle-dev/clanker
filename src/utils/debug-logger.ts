let debugEnabled = false;

export function setDebugMode(enabled: boolean) {
  debugEnabled = enabled;
}

export function isDebugMode(): boolean {
  return debugEnabled;
}

export const debug = {
  log: (...args: any[]) => {
    if (debugEnabled) {
      console.log('[DEBUG]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (debugEnabled) {
      console.error('[DEBUG ERROR]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (debugEnabled) {
      console.warn('[DEBUG WARN]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (debugEnabled) {
      console.info('[DEBUG INFO]', ...args);
    }
  }
};