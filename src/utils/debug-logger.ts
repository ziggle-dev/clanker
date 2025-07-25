import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let debugEnabled = false;
let logToFile = false;
let logStream: fs.WriteStream | null = null;
let logFilePath: string | null = null;

export function setDebugMode(enabled: boolean, fileLogging = false): void {
  debugEnabled = enabled;
  logToFile = fileLogging && enabled;
  
  if (logToFile && !logStream) {
    initializeFileLogging();
  } else if (!logToFile && logStream) {
    closeFileLogging();
  }
}

function initializeFileLogging(): void {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logDir = path.join(os.homedir(), '.clanker', 'debug', 'logs');
    
    // Create directory if it doesn't exist
    fs.mkdirSync(logDir, { recursive: true });
    
    logFilePath = path.join(logDir, `debug_${timestamp}.log`);
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    
    logToStream(`=== Debug log started at ${new Date().toISOString()} ===\n`);
    logToStream(`Log file: ${logFilePath}\n`);
    logToStream(`Process: ${process.argv.join(' ')}\n`);
    logToStream(`Working directory: ${process.cwd()}\n`);
    logToStream(`===========================================\n\n`);
    
    console.log(`[DEBUG] Logging to file: ${logFilePath}`);
  } catch (error) {
    console.error('[DEBUG] Failed to initialize file logging:', error);
    logToFile = false;
  }
}

function closeFileLogging(): void {
  if (logStream) {
    logToStream(`\n=== Debug log ended at ${new Date().toISOString()} ===\n`);
    logStream.end();
    logStream = null;
  }
}

function logToStream(message: string): void {
  if (logStream) {
    logStream.write(message);
  }
}

function formatArgs(args: any[]): string {
  return args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
}

export function isDebugMode(): boolean {
  return debugEnabled;
}

export function getLogFilePath(): string | null {
  return logFilePath;
}

export const debug = {
  log: (...args: any[]) => {
    if (debugEnabled) {
      const timestamp = new Date().toISOString();
      const message = formatArgs(args);
      
      console.log('[DEBUG]', ...args);
      
      if (logToFile && logStream) {
        logToStream(`[${timestamp}] [LOG] ${message}\n`);
      }
    }
  },
  error: (...args: any[]) => {
    if (debugEnabled) {
      const timestamp = new Date().toISOString();
      const message = formatArgs(args);
      
      console.error('[DEBUG ERROR]', ...args);
      
      if (logToFile && logStream) {
        logToStream(`[${timestamp}] [ERROR] ${message}\n`);
      }
    }
  },
  warn: (...args: any[]) => {
    if (debugEnabled) {
      const timestamp = new Date().toISOString();
      const message = formatArgs(args);
      
      console.warn('[DEBUG WARN]', ...args);
      
      if (logToFile && logStream) {
        logToStream(`[${timestamp}] [WARN] ${message}\n`);
      }
    }
  },
  info: (...args: any[]) => {
    if (debugEnabled) {
      const timestamp = new Date().toISOString();
      const message = formatArgs(args);
      
      console.info('[DEBUG INFO]', ...args);
      
      if (logToFile && logStream) {
        logToStream(`[${timestamp}] [INFO] ${message}\n`);
      }
    }
  }
};

// Ensure log is closed on process exit
process.on('exit', closeFileLogging);
process.on('SIGINT', () => {
  closeFileLogging();
  process.exit();
});
process.on('SIGTERM', () => {
  closeFileLogging();
  process.exit();
});