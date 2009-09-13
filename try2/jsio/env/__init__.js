require('jsio', ['getEnvironment', 'bind', 'log', 'test']);

function getObj(objectName, transportName, envName) {
	envName = envName || getEnvironment();
	try {
		var what = {};
		what[objectName] = 'result';
		require('.' + envName + '.' + transportName, what);
	} catch(e) {
		throw new Error('No ' + objectName + ' found for ' + transportName + ' in ' + envName);
	}
	return result;
}

exports.getListener = bind(this, getObj, 'Listener');
exports.getConnector = bind(this, getObj, 'Connector');
