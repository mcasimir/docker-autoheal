'use strict';

global._mcasimirSingletonStore = global._mcasimirSingletonStore || {};

function singleton(key, fn) {
  global._mcasimirSingletonStore[key] = global._mcasimirSingletonStore[key] || fn();
  return global._mcasimirSingletonStore[key];
}

module.exports = singleton;
