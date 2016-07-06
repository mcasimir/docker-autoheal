import {EventEmitter} from 'events';
import {autobind} from 'core-decorators';
import monitor from 'node-docker-monitor';
import Docker from 'dockerode';
import HealthCheck from './HealthCheck';
import logger from './logger';

class Monitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.docker = new Docker(options.docker || {});
    this.containers = {};
  }

  onContainerUp(containerInfo) {
    logger.verbose('container up', containerInfo.Name, containerInfo.Id);
    let container = this.docker.getContainer(containerInfo.Id);
    let check = new HealthCheck(container, containerInfo);
    this.containers[containerInfo.Id] = check;
    check.on('unhealthy', this.restartUnhealthyContainer.bind(this));
    check.start();
  }

  onContainerDown(containerInfo) {
    logger.verbose(`Container down ${containerInfo.Name}`);
    let check = this.containers[containerInfo.Id];
    if (check) {
      check.stop();
      check.removeAllListeners('unhealthy');
      delete this.containers[containerInfo.Id];
    }
  }

  start() {
    logger.verbose('Starting monitor ...');
    monitor({
      onContainerUp: this.onContainerUp,
      onContainerDown: this.onContainerDown
    }, this.docker);
  }

  restartUnhealthyContainer(containerDescriptor) {
    containerDescriptor.container.restart(err => {
      if (err) {
        logger.verbose('error', err);
        return this.emit('error', err);
      }

      logger.verbose(
        `Container restarted ${containerDescriptor.containerInfo.Name}`
      );

      this.emit('restarted', containerDescriptor.containerInfo.Id);
    });
  }
}

module.exports = Monitor;
