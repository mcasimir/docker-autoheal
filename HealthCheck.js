const {EventEmitter} = require('events');
const packageName = require('./package').name;
const debug = require('debug')(`${packageName}:HealthCheck`);
const containerExec = require('./containerExec');
const LABEL_PREFIX = 'com.github.mcasimir.autoheal.check.';

const DEFAULT_OPTIONS = {
  frequency: 5000,
  grace: 10000
};

class HealthCheck extends EventEmitter{
  constructor(container, containerInfo) {
    super();
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
      debug('discarded', this.container.Name);
      return;
    }

    debug('started', this.container.Name);

    this._run();
  }

  _run() {
    debug('running healthcheck on', this.containerInfo.Name);
    this.timeout = setTimeout(() => {
      containerExec(this.container, ['sh', '-c', this.config.cmd])
        .then((execResult) => {
          this.container.inspect((err, containerInfo) => {
            if (err) {
              debug('container.inspect error', err);
              return this.emit('error', err);
            }
            this.containerInfo = containerInfo;

            let now = new Date();
            let state = containerInfo.State;
            console.log(state.StartedAt);
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
        })
        .catch((error) => {
          debug('error', this.container.Name, error);
          this.emit('error', error);
          this._run();
        });

    }, this.config.frequency);
  }

  stop() {
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
