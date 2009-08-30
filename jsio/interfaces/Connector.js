jsio.declare('jsio.interfaces.Connector', function() {
	this.init = function(protocolClass, opts) {
		this._protocolClass = protocolClass;
		this._opts = opts;
	}
	
	this.onConnect = function(transport) {
		var protocol = new this._protocolClass();
		transport.makeConnection(protocol);
		protocol.transport = transport;
		protocol.connectionMade();
		
		this._protocol = protocol;
	}
	
	this.getProtocol = function() { return this._protocol; }
});
