jsio('import log, bind');
jsio('from jsio import getEnvironment');

function getObj(objectName, transportName, envName) {
	jsio('from .' + (envName || getEnvironment()) + '.' + transportName + ' import ' + objectName + ' as result');
	return result;
}

exports.getListener = bind(this, getObj, 'Listener');
exports.getConnector = bind(this, getObj, 'Connector');
