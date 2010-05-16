function getObj(objectName, transportName, envName) {
	try {
		jsio('from .env.' + (envName || jsio.__env.name) + '.' + transportName + ' import ' + objectName + ' as result');
	} catch(e) {
		throw logger.error('Invalid transport (', transportName, ') or environment (', envName, ')');
	}
	return result;
}

exports.getListener = bind(this, getObj, 'Listener');
exports.getConnector = bind(this, getObj, 'Connector');
