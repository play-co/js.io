jsio('import log, bind');
jsio('from jsio import getEnvironment');

function getObj(objectName, transportName, envName) {
	jsio('import .' + (envName || getEnvironment()) + '.' + transportName + ' as result');
	return result;
}

exports.getListener = bind(this, getObj, 'Listener');
exports.getConnector = bind(this, getObj, 'Connector');
