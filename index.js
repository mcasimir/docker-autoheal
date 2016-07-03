const url = require('url');
const {readFileSync} = require('fs');
const Monitor = require('./Monitor');
let {hostname, port} = url.parse(process.env.DOCKER_HOST);

let monitor = new Monitor({
  docker: {
    host: hostname,
    port: port,
    protocol: 'https',
    ca: readFileSync(process.env.DOCKER_CERT_PATH + '/ca.pem'),
    cert: readFileSync(process.env.DOCKER_CERT_PATH + '/cert.pem'),
    key: readFileSync(process.env.DOCKER_CERT_PATH + '/key.pem')
  }
});

monitor.start();
