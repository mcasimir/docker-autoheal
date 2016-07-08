const {EventEmitter} = require('events');
const logger = require('./logger');
const config = require('../config');
const LABEL_PREFIX = config.labelPrefix;

class HealthCheck extends EventEmitter{
  constructor(container) {
    super();
    this.running = false;
    this.container = container;
    let labelsConfig = this._parseHealthCheckLabels(container.labels);
    if (labelsConfig) {
      this.config = Object.assign({}, config, labelsConfig);
      delete this.config.labelPrefix;
    }
    this.timeout = null;
  }

  start() {
    if (!this.config) {
      return logger.silly('Discarded', {container: this.container.name});
    }

    logger.verbose('Healthcheck enabled', {container: this.container.name});
    this.running = true;

    this._run();
  }

  _run() {
    logger.verbose('Running healthcheck', {
      command: this.config.cmd,
      container: this.container.name
    });

    clearTimeout(this.timeout);

    if (!this.running) {
      return;
    }

    let loggingMetadata = {
      container: this.container.name
    };

    this.timeout = setTimeout(() => {
      this.container.exec([
        'sh', '-c', this.config.cmd
      ]).then(({exitCode}) => {
          return this.container.inspect()
            .then(({state}) => {
              let now = new Date();
              let startedAt = new Date(state.startedAt);
              let graceDiff = (now - startedAt);

              if (state.status !== 'running') {
                return Promise.reject(new Error('Container not running'));
              }

              if (graceDiff <= this.config.grace) {
                logger.verbose('Container is still in grace period', loggingMetadata);
                return Promise.resolve();
              }

              if (exitCode !== 0) {
                logger.info('Health check failed', loggingMetadata);
                this.emit('unhealthy', this.container);

              } else {
                logger.verbose('Health check passed', loggingMetadata);

                this.emit('healthy', this.container);
              }

              return Promise.resolve();
            });
        })
        .then(() => {
          this._run();
        })
        .catch((error) => {
          logger.error(error.message, Object.assign(loggingMetadata, {error: error}));

          this.emit('error', error);
          this._run();
          return Promise.reject(error);
        });
    }, this.config.frequency);
  }

  stop() {
    this.running = false;
    clearTimeout(this.timeout);
  }

  _parseHealthCheckLabels(labels = {}) {
    let options;
    for (let labelKey of Object.keys(labels)) {
      if (labelKey.startsWith(LABEL_PREFIX)) {
        options = options || {};
        options[labelKey.slice(LABEL_PREFIX.length)] = labels[labelKey];
      }
    }
    return options;
  }
}

module.exports = HealthCheck;
