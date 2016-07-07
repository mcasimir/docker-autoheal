const {EventEmitter} = require('events');
const monitor = require('node-docker-monitor');
const Docker = require('dockerode');
const logger = require('./logger');

const HealthCheck = require('./HealthCheck');
const Container = require('./Container');

class Monitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.docker = new Docker(options.docker || {});
    this.healthChecks = {};
  }

  onContainerUp(containerInfo) {
    logger.verbose('UP', {container: containerInfo.Name});
    let container = new Container(this.docker, containerInfo.Id, containerInfo);
    let check = new HealthCheck(container);
    this.healthChecks[containerInfo.Id] = check;
    check.on('unhealthy', this.restartUnhealthyContainer.bind(this));
    check.start();
  }

  onContainerDown(containerInfo) {
    logger.verbose('DOWN', {container: containerInfo.Name});
    let check = this.healthChecks[containerInfo.Id];
    if (check) {
      check.stop();
      check.removeAllListeners('unhealthy');
      delete this.healthChecks[containerInfo.Id];
    }
  }

  start() {
    logger.verbose('Starting monitor ...');
    monitor({
      onContainerUp: this.onContainerUp.bind(this),
      onContainerDown: this.onContainerDown.bind(this)
    }, this.docker);
  }

  restartUnhealthyContainer(container) {
    logger.info('RESTART', {container: container.name});
    container.restart()
      .then(() => {
        logger.info('RESTARTED', {container: container.name});
        this.emit('restarted', container);
      })
      .catch(err => {
        logger.verbose('error', err);
        return this.emit('error', err);
      });
  }
}

module.exports = Monitor;
