import winston from 'winston';
import 'winston-daily-rotate-file';

/**
 * Centralized logging setup
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(
        ({ level, message, timestamp, ...meta }) =>
          `${timestamp} [${level}] ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`
      )
    ),
  }),
];

// Add file rotation in production
if (!isDevelopment) {
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxDays: '14d',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    })
  );

  transports.push(
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxDays: '30d',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    })
  );
}

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  transports,
  exceptionHandlers: [new winston.transports.File({ filename: 'logs/exceptions.log' })],
});

export default logger;

export { logger };
