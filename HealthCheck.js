const {EventEmitter} = require('events');
const packageName = require('./package').name;
const debug = require('debug')(`${packageName}:HealthCheck`);
const containerExec = require('./containerExec');
const LABEL_PREFIX = 'com.github.mcasimir.autoheal.check.';

let counter = 0;

const DEFAULT_OPTIONS = {
  frequency: 5000,
  grace: 15000
};

class HealthCheck extends EventEmitter{
  constructor(container, containerInfo) {
    super();
    this.running = false;
    this.container = container;
    this.containerInfo = containerInfo;
    let labelsConfig = this._parseHealthCheckLabels(containerInfo.Labels);
    if (labelsConfig) {
      this.config = Object.assign({}, DEFAULT_OPTIONS, labelsConfig);
    }
    this.id = counter++;
    this.timeout = null;
  }

  start() {
    if (!this.config) {
      debug('discarded', this.containerInfo.Name);
      return;
    }

    debug('started', this.containerInfo.Name);
    this.running = true;
    this._run();
  }

  _run() {
    debug('running healthcheck', this.config.cmd, 'on', this.containerInfo.Name);
    clearTimeout(this.timeout);
    if (!this.running) {
      return;
    }
    this.timeout = setTimeout(() => {
      containerExec(this.container, ['sh', '-c', this.config.cmd])
        .catch((error) => {
          debug('error', this.containerInfo.Name, error);
          this.emit('error', error);
          this._run();
          return Promise.reject(error);
        })
        .then((execResult) => {
          debug('on', this.containerInfo.Name, 'check exited with', execResult.inspect.ExitCode);
          this.container.inspect((err, containerInfo) => {
            if (err) {
              debug('container.inspect error', err);
              return this.emit('error', err);
            }
            this.containerInfo = containerInfo;

            let now = new Date();
            let state = containerInfo.State;
            let startedAt = new Date(state.StartedAt);
            let graceDiff = (now - startedAt);
            debug('graceDiff', graceDiff);

            if (state.Status === 'running' &&
                graceDiff > this.config.grace) {

              if (execResult.inspect.ExitCode !== 0) {
                debug('check failed', this.containerInfo.Name);
                this.emit('unhealthy', this.container);
              } else {
                debug('check ok', this.containerInfo.Name);
                this.emit('healthy', this.container);
              }

              this._run();
            } else {
              if (state.Status !== 'running') {
                debug('container not running', this.containerInfo.Name);
              } else {
                debug('container still in grace period', this.containerInfo.Name);
              }

              this._run();
            }
          });
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
