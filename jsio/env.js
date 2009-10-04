jsio('import log, bind');

function getObj(objectName, transportName, envName) {
	jsio('from .env.' + (envName || jsio.__env) + '.' + transportName + ' import ' + objectName + ' as result');
	return result;
}

exports.getListener = bind(this, getObj, 'Listener');
exports.getConnector = bind(this, getObj, 'Connector');
