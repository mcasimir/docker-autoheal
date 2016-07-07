const camelizeObject = require('camelize-object');

module.exports = class Container {
  constructor(docker, id, info = {}) {
    this.labels = info.Labels;
    info = camelizeObject(info);
    this.id = id;
    this.info = info;
    this.name = info.name || this.id;
    this.container = docker.getContainer(this.id);
  }

  exec(command) {
    console.log(10);
    return new Promise((resolve, reject) => {
      this.container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false
      }, (err, exec) => {
        console.log(11);
        if (err) {
          return reject(err);
        }

        exec.start({}, (err, stream) => {
          console.log(12);
          if (err) {
            return reject(err);
          }

          let fulfilled = false;

          stream.on('error', (err) => {
            if (!fulfilled) {
              fulfilled = true;
              reject(err);
            }
          });

          stream.on('end', () => {
            exec.inspect((err, data) => {
              if (err) {
                return reject(err);
              }
              if (!fulfilled) {
                fulfilled = true;
                resolve(camelizeObject(data));
              }
            });
          });
        });
      });
    });
  }

  restart() {
    return new Promise((resolve, reject) => {
      this.container.restart(err => {
        if (err) {
          this.emit('error', err);
          return reject(err);
        }
        resolve();
      });
    });
  }

  inspect() {
    return new Promise((resolve, reject) => {
      this.container.inspect((err, info) => {
        if (err) {
          this.emit('error', err);
          return reject(err);
        }
        this.info = info;
        resolve(camelizeObject(info));
      });
    });
  }
};
