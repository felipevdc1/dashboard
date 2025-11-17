/**
 * Centralized Logging System
 *
 * Replaces direct console.log usage throughout the app.
 * Debug logs only show in development, while info/warn/error always show.
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: any;
}

class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  /**
   * Debug logs - only in development
   * Use for detailed debugging information
   */
  debug(message: string, ...args: any[]): void {
    if (isDevelopment && !isTest) {
      const formatted = this.formatMessage('debug', message);
      console.log(formatted, ...args);
    }
  }

  /**
   * Info logs - always shown
   * Use for important application events
   */
  info(message: string, ...args: any[]): void {
    if (!isTest) {
      const formatted = this.formatMessage('info', message);
      console.info(formatted, ...args);
    }
  }

  /**
   * Warning logs - always shown
   * Use for recoverable errors or warnings
   */
  warn(message: string, ...args: any[]): void {
    if (!isTest) {
      const formatted = this.formatMessage('warn', message);
      console.warn(formatted, ...args);
    }
  }

  /**
   * Error logs - always shown
   * Use for errors and exceptions
   */
  error(message: string, error?: Error | any, metadata?: LogMetadata): void {
    if (!isTest) {
      const formatted = this.formatMessage('error', message);

      if (error instanceof Error) {
        console.error(formatted, {
          message: error.message,
          stack: error.stack,
          ...metadata,
        });
      } else if (error) {
        console.error(formatted, error, metadata);
      } else {
        console.error(formatted, metadata);
      }
    }
  }

  /**
   * Create a child logger with a specific prefix
   */
  child(childPrefix: string): Logger {
    const newPrefix = this.prefix ? `${this.prefix}:${childPrefix}` : childPrefix;
    return new Logger(newPrefix);
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}]` : '';

    // Add emoji for better visual scanning
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[level];

    return `${emoji} ${timestamp} ${prefix} ${message}`;
  }
}

// Export singleton instances for common use cases
export const logger = new Logger();

// Specialized loggers for different modules
export const apiLogger = logger.child('API');
export const cacheLogger = logger.child('CACHE');
export const syncLogger = logger.child('SYNC');
export const metricsLogger = logger.child('METRICS');
export const affiliateLogger = logger.child('AFFILIATE');

// Export Logger class for custom instances
export { Logger };

// Export for testing purposes
export const _internal = {
  isDevelopment,
  isTest,
};
