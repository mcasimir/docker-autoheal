let success = true;

setTimeout(() => {
  console.info('Switching to unhealthy.');
  success = false;
}, 5000);

console.info('Server started.');

require('http').createServer((req, res) => {
  let status = success ? 200 : 500;
  console.info(new Date(), status);
  res.writeHead(status, {'Content-Type': 'text/plain'});
  res.end();
}).listen(3000);
