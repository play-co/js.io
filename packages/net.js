jsio('import net.env');
jsio('import std.JSON as JSON');

JSON.createGlobal(); // create the global JSON object if it doesn't already exist

exports.listen = function(server, transportName, opts) {
	var listenerClass = net.env.getListener(transportName);
	var listener = new listenerClass(server, opts);
	listener.listen();
	return listener;
}

exports.connect = function(protocolInstance, transportName, opts) {
	var connector = new (net.env.getConnector(transportName))(protocolInstance, opts);
	connector.connect();
	return connector;
}

exports.quickServer = function(protocolClass) {
	jsio('import net.interfaces');
	return new net.interfaces.Server(protocolClass);
}
