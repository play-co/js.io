PKG('from base import *');

function getObj(objectName, transportName, envName) {
	PKG('from .env.' + (envName || PKG.__env.name) + '.' + transportName + ' import ' + objectName + ' as result');
	return result;
}

exports.getListener = bind(this, getObj, 'Listener');
exports.getConnector = bind(this, getObj, 'Connector');
