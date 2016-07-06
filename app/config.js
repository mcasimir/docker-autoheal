import {labelPrefix, defaultFrequency, defaultGrace} from '../config';
const {LABEL_PREFIX, DEFAULT_FREQUENCY, DEFAULT_GRACE} = process.env;

export default {
  labelPrefix: LABEL_PREFIX || labelPrefix,
  defaults: {
    frequency: DEFAULT_FREQUENCY || defaultFrequency,
    grace: DEFAULT_GRACE || defaultGrace
  }
};
