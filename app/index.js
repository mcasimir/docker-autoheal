import Monitor from './Monitor';

let monitor = new Monitor({
  docker: {socketPath: '/var/run/docker.sock'}
});

monitor.start();
