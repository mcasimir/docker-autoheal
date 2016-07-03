const docker = require('./docker');

module.exports = function(containers, image, name) {
  name = name || image;

  beforeEach(function(done) {
    docker.createContainer({Image: image}, (err, container) => {
      if (err) {
        return done(err);
      }

      container.start((err) => {
        if (err) {
          return done(err);
        }

        containers[name] = container;
        done();
      });
    });
  });

  afterEach(function(done) {
    containers[name].stop((err) => {
      if (err) {
        return done(err);
      }

      containers[name].remove(done);
      delete containers[name];
    });
  });
};
