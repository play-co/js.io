function getObj(objectName, transportName, envName) {

  try {
    var DYNAMIC_IMPORT_ENV = 'from .' + (envName || jsio.__env.name) + '.' + transportName + ' import ' + objectName + ' as result';
    jsio(DYNAMIC_IMPORT_ENV);
  } catch(e) {
    throw logger.error('Invalid transport (', transportName, ') or environment (', envName, ')', e);
  }
  return result;
}

exports.getListener = bind(this, getObj, 'Listener');
exports.getConnector = bind(this, getObj, 'Connector');
