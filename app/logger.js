import winston from 'winston';
import singleton from './singleton';

const LOG_FORMAT = process.env.LOG_FORMAT || 'json';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

let transportOptions = {
  handleExceptions: true,
  level: LOG_LEVEL
};

if (LOG_FORMAT === 'json') {
  Object.assign(transportOptions, {
    json: true,
    stringify: true
  });
}

if (LOG_FORMAT === 'pretty') {
  Object.assign(transportOptions, {
    colorize: true,
    prettyPrint: true,
    humanReadableUnhandledException: true
  });
}

export default singleton('com.github.mcasimir.autoheal.logger', () => {
  return new winston.Logger({
    transports: [
      new winston.transports.Console(transportOptions)
    ],
    exitOnError: false
  });
});
