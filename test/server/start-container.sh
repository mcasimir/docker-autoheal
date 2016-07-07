#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

docker rm -f autoheal-test-app
docker run -p 3000:3000 --name autoheal-test-app \
  -v ${DIR}/test-server.js:/src/test-server.js -w /src \
  -l com.github.mcasimir.autoheal.check.cmd="curl -I -f --connect-timeout 1 -X HEAD http://127.0.0.1:3000" \
  node:6 \
  node test-server.js
