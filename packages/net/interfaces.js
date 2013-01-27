// Sort of like a twisted protocol
jsio('import net');
jsio('import lib.Enum as Enum');

var ctx = jsio.__env.global;

exports.Protocol = Class(function() {
	this.connectionMade = function(isReconnect) {}
	this.dataReceived = function(data) {}
	this.connectionLost = function(reason) {}
	
	this._connectionMade = function() {
		this._isConnected = true;
		this.connectionMade.apply(this, arguments);
	}

	this._connectionLost = function() {
		this._isConnected = true;
		this.connectionLost.apply(this, arguments);
	}

	this._isConnected = false;
	this.isConnected = function() {
		return !!this._isConnected;
	}
	
	
});

exports.Client = Class(function() {
	this.init = function(protocol) {
		this._protocol = protocol;
	}
	
	this.connect = function(transportName, opts) {
		this._remote = new this._protocol();
		this._remote._client = this;
		net.connect(this._remote, transportName, opts);
	}
});

// Sort of like a twisted factory
exports.Server = Class(function() {
	this.init = function(protocolClass) {
		this._protocolClass = protocolClass;
	}

	this.buildProtocol = function() {
		return new this._protocolClass();
	}
	
	this.listen = function(how, port) {
		return net.listen(this, how, port);
	}
});

exports.Transport = Class(function() {
	this._encoding = 'plain'
	this.write = function(data, encoding) {
		throw new Error("Not implemented");
	}
	this.getPeer = function() {
		throw new Error("Not implemented");
	}
	this.setEncoding = function(encoding) {
		this._encoding = encoding;
	}
	this.getEncoding = function() {
		return this._encoding;
	}
});

exports.Listener = Class(function() {
	this.init = function(server, opts) {
		this._server = server;
		this._opts = opts || {};
	}
	
	this.onConnect = function(transport) {
		//try {
			var p = this._server.buildProtocol();
			p.transport = transport;
			p.server = this._server;
			transport.protocol = p;
			transport.makeConnection(p);
			p._connectionMade();
		//} catch(e) {
		//	logger.error(e);
		//}
	}
	
	this.listen = function() { throw new Error('Abstract class'); }
	this.stop = function() {}
});

exports.STATE = Enum('INITIAL', 'DISCONNECTED', 'CONNECTING', 'CONNECTED');
exports.Connector = Class(function() {
	this.init = function(protocol, opts) {
		this._protocol = protocol;
		this._opts = opts;
		this._state = exports.STATE.INITIAL;
	}
	
	this.getState = function() { return this._state; }
	
	this.onConnect = function(transport) {
		this._state = exports.STATE.CONNECTED;

		transport.makeConnection(this._protocol);
		this._protocol.transport = transport;
		try {
			this._protocol._connectionMade();
		} catch(e) {
			throw logger.error(e);
		}
	}
	
	this.onDisconnect = function(err) {
		var wasConnected = this._state == exports.STATE.CONNECTED;
		this._state = exports.STATE.DISCONNECTED;
		
		try {
			this._protocol._connectionLost(err, wasConnected);
		} catch(e) {
			throw logger.error(e);
		}
	}
	
	this.getProtocol = function() { return this._protocol; }
});
