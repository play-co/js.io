require('jsio', ['getEnvironment']);
exports.getListener = function(transportName, envName) {
	if (!envName) {
		envName = getEnvironment();
	}
	var path = '.' + envName + '.' + transportName
	try {
		require(path, ['Listener'])
	} catch(e) {
		throw new Error('No listener found for ' + transportName + ' in ' + envName);
	}
	return Listener;
}

exports.getConnector = function(transportName, envName) {
	if (!envName) {
		envName = getEnvironment();
	}
	var path = '.' + envName + '.' + transportName
	try {
		require(path, ['Connector'])
	} catch(e) {
		throw new Error('No connector found for ' + transportName + ' in ' + envName);
	}
	return Connector;
}


