import {EventEmitter} from 'events';
import {autobind} from 'core-decorators';
import monitor from 'node-docker-monitor';
import Docker from 'dockerode-promise-es6';
import HealthCheck from './HealthCheck';
import {debug} from './logger';

class Monitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.docker = new Docker(options.docker || {});
    this.containers = {};
  }

  @autobind
  onContainerUp(containerInfo) {
    debug('container up', containerInfo.Name, containerInfo.Id);
    let container = this.docker.getContainer(containerInfo.Id);
    let check = new HealthCheck(container, containerInfo);
    this.containers[containerInfo.Id] = check;
    check.on('unhealthy', this.restartUnhealthyContainer.bind(this));
    check.start();
  }

  @autobind
  onContainerDown(containerInfo) {
    debug('container down', containerInfo.Name, containerInfo.Id);
    let check = this.containers[containerInfo.Id];
    if (check) {
      check.stop();
      check.removeAllListeners('unhealthy');
      delete this.containers[containerInfo.Id];
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
