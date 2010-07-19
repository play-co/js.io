jsio('import net.env');
jsio('import std.JSON as JSON');

JSON.createGlobal(); // create the global JSON object if it doesn't already exist

exports.listen = function(server, transportName, opts) {
	if (!transportName) {
		throw logger.error('No transport provided for net.listen');
	}
	var listenerClass = net.env.getListener(transportName);
	var listener = new listenerClass(server, opts);
	listener.listen();
	return listener;
}

exports.connect = function(protocolInstance, transportName, opts) {
	var ctor = net.env.getConnector(transportName),
		connector = new ctor(protocolInstance, opts);
	
	connector.connect();
	return connector;
}

exports.quickServer = function(protocolClass) {
	jsio('import net.interfaces');
	return new net.interfaces.Server(protocolClass);
}
