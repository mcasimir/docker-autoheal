module.exports = function containerExec(container, command) {
  return new Promise(function(resolve, reject) {
    container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false
    }, (err, exec) => {
      if (err) {
        return reject(err);
      }

      exec.start({}, (err, stream) => {
        if (err) {
          return reject(err);
        }

        let fulfilled = false;
        let stdout = '';

        stream.on('data', function(data) {
          stdout += data.toString();
        });

        stream.on('error', function(err) {
          if (!fulfilled) {
            fulfilled = true;
            reject(err);
          }
        });

        stream.on('end', function() {
          exec.inspect(function(err, data) {
            if (err) {
              return reject(err);
            }
            if (!fulfilled) {
              fulfilled = true;
              resolve({
                output: stdout,
                inspect: data
              });
            }
          });
        });
      });
    });
  });
};
