const Monitor = require('./lib/Monitor');

let monitor = new Monitor({
  docker: {socketPath: '/var/run/docker.sock'}
});

monitor.start();
