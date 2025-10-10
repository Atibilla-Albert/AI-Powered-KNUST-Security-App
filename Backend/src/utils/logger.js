/**
 * Enhanced Logger Utility for AWS Lambda
 * - Colored output using chalk
 * - Contextual and timestamped
 * - Log level filtering
 */

const chalk = require('chalk');

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

const LOG_LEVEL_PRIORITY = {
  [LOG_LEVELS.DEBUG]: 1,
  [LOG_LEVELS.INFO]: 2,
  [LOG_LEVELS.WARN]: 3,
  [LOG_LEVELS.ERROR]: 4
};

// Allow runtime override via process.env
let currentLogLevel = process.env.LOG_LEVEL || LOG_LEVELS.INFO;

// Color styles
const levelColors = {
  [LOG_LEVELS.DEBUG]: chalk.gray,
  [LOG_LEVELS.INFO]: chalk.cyan,
  [LOG_LEVELS.WARN]: chalk.yellow,
  [LOG_LEVELS.ERROR]: chalk.red
};

/**
 * Whether to log based on current level
 */
const shouldLog = (level) =>
  LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel];

/**
 * Formats log line with timestamp and context
 */
const formatLogMessage = (level, message, context) => {
  const timestamp = new Date().toISOString();
  const contextString = context ? ` | ${JSON.stringify(context)}` : '';
  const rawMessage = `${timestamp} [${level}] ${message}${contextString}`;
  return levelColors[level] ? levelColors[level](rawMessage) : rawMessage;
};

/**
 * Base log writer
 */
const log = (level, message, context) => {
  if (!shouldLog(level)) return;

  const output = formatLogMessage(level, message, context);
  const stream = level === LOG_LEVELS.ERROR ? console.error
               : level === LOG_LEVELS.WARN  ? console.warn
               : level === LOG_LEVELS.INFO  ? console.info
               : console.debug;

  stream(output);
};

/**
 * Set log level dynamically
 */
const setLogLevel = (level) => {
  if (!LOG_LEVEL_PRIORITY[level]) {
    console.warn(`⚠️ Invalid log level: ${level}. Using existing level: ${currentLogLevel}`);
    return;
  }
  currentLogLevel = level;
};

/**
 * Logger Interface
 */
const logger = {
  debug: (msg, ctx) => log(LOG_LEVELS.DEBUG, msg, ctx),
  info: (msg, ctx) => log(LOG_LEVELS.INFO, msg, ctx),
  warn: (msg, ctx) => log(LOG_LEVELS.WARN, msg, ctx),
  error: (msg, ctx) => log(LOG_LEVELS.ERROR, msg, ctx),
  setLogLevel,
  getLogLevel: () => currentLogLevel,
  LOG_LEVELS
};

module.exports = logger;
