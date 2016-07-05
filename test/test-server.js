console.info('Starting server ...');

require('http').createServer((req, res) => {
  let status = Math.random() > 0.5 ? 200 : 500;
  console.info('Responding with', status);
  res.writeHead(status, {'Content-Type': 'text/plain'});
  res.end();
}).listen(3000);
