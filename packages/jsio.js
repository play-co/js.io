var local = {};
PKG('import .jsio.env as env', local);
PKG('import .std.JSON as JSON', local);

local.JSON.createGlobal(); // create the global JSON object if it doesn't already exist

exports.listen = function(server, transportName, opts) {
	var listenerClass = local.env.getListener(transportName);
	var listener = new listenerClass(server, opts);
	listener.listen();
	return listener;
}

exports.connect = function(protocolInstance, transportName, opts) {
	var connector = new (local.env.getConnector(transportName))(protocolInstance, opts);
	connector.connect();
	return connector;
}

exports.quickServer = function(protocolClass) {
	PKG('import .interfaces', local);
	return new local.interfaces.Server(protocolClass);
}
