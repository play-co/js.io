jsio.declare('jsio.interfaces.Listener', function() {
	this.init = function(server, opts) {
		this._server = server;
		this._opts = opts || {};
	}
	
	this.onConnect = function(transport) {
		var p = this._server.buildProtocol();
		p.transport = transport;
		transport.protocol = p;
		transport.makeConnection(p);
		p.connectionMade();
	}
	
	this.listen = function() { throw new Error('Abstract class'); }
	this.stop = function() {}
});

