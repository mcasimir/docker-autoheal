import {EventEmitter} from 'events';
import containerExec from './containerExec';
import logger from './logger';
import {autobind} from 'core-decorators';
import {labelPrefix, defaults} from './config';

class HealthCheck extends EventEmitter {
  constructor(container, containerInfo) {
    super();
    this.running = false;
    this.container = container;
    this.containerInfo = containerInfo;
    let labelsConfig = this._parseHealthCheckLabels(containerInfo.Labels);
    if (labelsConfig) {
      this.config = Object.assign({}, defaults, labelsConfig);
    }
    this.timeout = null;
  }

  start() {
    if (!this.config) {
      logger.verbose(`Ignored container ${this.containerInfo.Name}`);
      return;
    }

    logger.info(`Starting checks for ${this.containerInfo.Name}`);

    this.running = true;
    this._run();
  }

  _run() {
    clearTimeout(this.timeout);

    if (!this.running) {
      return;
    }

    logger.verbose(`Running ${this.config.cmd} on ${this.containerInfo.Name}`);

    this.timeout = setTimeout(
      this._performHealthCheck,
      this.config.frequency
    );
  }

  @autobind
  async _performHealthCheck() {
    try {
      let {ExitCode} = await containerExec(this.container, [
        'sh', '-c', this.config.cmd
      ]);

      let containerInfo = await this.container.inspect();

      logger.verbose(
        `Check on ${containerInfo.Name} ` +
        `exited with ${ExitCode}`
      );

      let containerDescriptor = {
        container: this.container,
        containerInfo: containerInfo
      };

      if (ExitCode === 0) {
        logger.verbose(`Container ${containerInfo.Name} healthy`);
        return this.emit('healthy', containerDescriptor);
      }

      let {Status, StartedAt} = containerInfo.State;

      if (Status !== 'running') {
        logger.verbose(`Container ${containerInfo.Name} not running`);
        return this.emit('invalid', containerDescriptor);
      }

      let now = new Date();
      let startedAt = new Date(StartedAt);
      let graceDiff = (now - startedAt);

      if (graceDiff > this.config.grace) {
        return this.emit('invalid', containerDescriptor);
      }

      logger.info(`Container ${containerInfo.Name} unhealthy`);
      this.emit('unhealthy', containerDescriptor);

    } catch (err) {
      logger.error(err);
      this.emit('error', err);

    } finally {
      this._run();
    }
  }

  stop() {
    this.running = false;
    clearTimeout(this.timeout);
  }

  _parseHealthCheckLabels(labels = {}) {
    let options;
    for (let labelKey of Object.keys(labels)) {
      if (labelKey.startsWith(labelPrefix)) {
        options = options || {};
        options[labelKey.slice(labelPrefix.length)] = labels[labelKey];
      }
    }
    return options;
  }
}

module.exports = HealthCheck;
