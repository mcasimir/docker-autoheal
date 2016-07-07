const defaults = require('./defaults');
const {LABEL_PREFIX, FREQUENCY, GRACE} = process.env;

module.exports = Object.assign({
  labelPrefix: LABEL_PREFIX,
  frequency: FREQUENCY,
  grace: GRACE
}, defaults);
