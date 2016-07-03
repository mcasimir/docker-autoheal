const {EventEmitter} = require('events');
const monitor = require('node-docker-monitor');
const Docker = require('dockerode');

const HealthCheck = require('./HealthCheck');
const packageName = require('./package').name;
const debug = require('debug')(`${packageName}:Monitor`);

class Monitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.docker = new Docker(options.docker || {});
    this.containers = {};
  }

  onContainerUp(containerInfo) {
    debug('container up', containerInfo.Name);
    let container = this.docker.getContainer(containerInfo.Id);
    let check = new HealthCheck(container, containerInfo);
    this.containers[container.Id] = check;
    check.on('unhealthy', this.restartUnhealthyContainer.bind(this));
    check.start();
  }

  onContainerDown(container) {
    debug('container down', container.Name);

    let check = this.containers[container.Id];
    if (check) {
      check.stop();
      check.removeAllListeners('unhealthy');
      delete this.containers[container.Id];
    }
  }

  start() {
    debug('starting monitor ...');
    monitor({
      onContainerUp: this.onContainerUp.bind(this),
      onContainerDown: this.onContainerDown.bind(this)
    }, this.docker);
  }

  restartUnhealthyContainer(container) {
    container.restart(err => {
      if (err) {
        debug('error', err);
        return this.emit('error', err);
      }

      debug('restarted', container.Id);
      this.emit('restarted', container.Id);
    });
  }
}

module.exports = Monitor;
