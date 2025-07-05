import { Logger, LogLevel } from '@aws-lambda-powertools/logger';
/**
 * Singleton utility for providing a centralized logger instance.
 *
 * Uses AWS Lambda Powertools Logger to ensure a single logger instance is used throughout the application.
 * The logger is configured with the service name "svc-house" and log level from the LOG_LEVEL environment variable.
 */
class LoggerSingleton {
  private static instance: Logger;
  
  /**
   * Returns the singleton Logger instance.
   * If it does not exist, it creates one with the configured service name and log level.
   * @returns {Logger} The singleton Logger instance.
   */
  public static getInstance(): Logger {
    if (!LoggerSingleton.instance) {
      LoggerSingleton.instance = new Logger({
        serviceName: "svc-user-pingoo", 
        logLevel: (process.env.LOG_LEVEL as any)||  "INFO",
      });
    }
    return LoggerSingleton.instance;
  }
}

export default LoggerSingleton;