process.env.LOG_LEVEL = 'verbose';
process.env.LOG_FORMAT = 'pretty';

const url = require('url');
const {readFileSync} = require('fs');
let {hostname, port} = url.parse(process.env.DOCKER_HOST);

const Monitor = require('./lib/Monitor');

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
