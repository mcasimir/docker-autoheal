const testContainer = require('./helpers/testContainer');
const assert = require('assert');
const containerExec = require('../../containerExec');

let containers = {};

describe('containerExec', function() {
  testContainer(containers, 'nginx', 'containerExec.nginx');

  it('returns after execution ends', function(done) {
    let container = containers['containerExec.nginx'];

    containerExec(container, ['sleep', '1'])
      .then(({inspect}) => {
        assert.equal(inspect.ExitCode, 0);
        assert.equal(inspect.Running, false);
        done();
      })
      .catch(done);
  });
});
