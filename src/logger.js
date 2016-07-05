import bunyan from 'bunyan';
import {name as packageName, version as packageVersion} from './package';

export default bunyan.createLogger({
  name: `${packageName}:${packageVersion}`
});
