let exports = {};

import {
  logger,
  bind
} from 'base';

var req = require.context('.', true, /\.js$/);

function getObj (objectName, transportName, envName) {
  try {
    // var DYNAMIC_IMPORT_ENV = 'from .' + (envName || jsio.__env.name) + '.' + transportName + ' import ' + objectName + ' as result';
    // jsio(DYNAMIC_IMPORT_ENV);
    var moduleName = '.' + ('.' + (envName || jsio.__env.name) + '.' +
      transportName).replace(/\./g, '/');
    result = req(moduleName)[objectName];
  } catch (e) {
    throw logger.error('Invalid transport (', transportName,
      ') or environment (', envName, ')', e);
  }
  return result;
}

exports.getListener = bind(this, getObj, 'Listener');
exports.getConnector = bind(this, getObj, 'Connector');

export default exports;
