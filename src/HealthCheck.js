import {EventEmitter} from 'events';
import containerExec from './containerExec';
import {debug, info, error} from './logger';
import {autobind} from 'core-decorators';

const LABEL_PREFIX = 'com.github.mcasimir.autoheal.check.';

const DEFAULT_OPTIONS = {
  frequency: 5000,
  grace: 15000
};

class HealthCheck extends EventEmitter {
  constructor(container, containerInfo) {
    super();
    this.running = false;
    this.container = container;
    this.containerInfo = containerInfo;
    let labelsConfig = this._parseHealthCheckLabels(containerInfo.Labels);
    if (labelsConfig) {
      this.config = Object.assign({}, DEFAULT_OPTIONS, labelsConfig);
    }
    this.timeout = null;
  }

  start() {
    if (!this.config) {
      debug(`Ignored container ${this.containerInfo.Name}`);
      return;
    }

    info(`Starting checks for ${this.containerInfo.Name}`);

    this.running = true;
    this._run();
  }

  _run() {
    clearTimeout(this.timeout);

    if (!this.running) {
      return;
    }

    debug(`Running ${this.config.cmd} on ${this.containerInfo.Name}`);

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

      debug(
        `Check on ${containerInfo.Name} ` +
        `exited with ${ExitCode}`
      );

      let containerDescriptor = {
        container: this.container,
        containerInfo: containerInfo
      };

      if (ExitCode === 0) {
        debug(`Container ${containerInfo.Name} healthy`);
        return this.emit('healthy', containerDescriptor);
      }

      let {Status, StartedAt} = containerInfo.State;

      if (Status !== 'running') {
        debug(`Container ${containerInfo.Name} not running`);
        return this.emit('invalid', containerDescriptor);
      }

      let now = new Date();
      let startedAt = new Date(StartedAt);
      let graceDiff = (now - startedAt);

      if (graceDiff > this.config.grace) {
        return this.emit('invalid', containerDescriptor);
      }

      info(`Container ${containerInfo.Name} unhealthy`);
      this.emit('unhealthy', containerDescriptor);

    } catch (err) {
      error(err);
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
      if (labelKey.startsWith(LABEL_PREFIX)) {
        options = options || {};
        options[labelKey.slice(LABEL_PREFIX.length)] = labels[labelKey];
      }
    }
    return options;
  }
}

module.exports = HealthCheck;
