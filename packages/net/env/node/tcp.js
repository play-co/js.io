jsio('import net.interfaces');

var nodeTcp = jsio.__env.require('net');

var Transport = Class(net.interfaces.Transport, function() {
	this.init = function(socket) {
		this._socket = socket;
	}

	this.makeConnection = function(protocol) {
		this._socket.addListener("data", bind(protocol, 'dataReceived'));
		this._socket.addListener("close", bind(protocol, 'connectionLost')); // TODO: map error codes
	}

	this.write = function(data) {
		this._socket.write(data);
	}

	this.loseConnection = function() {
		this._socket.forceClose();
	}
});

/**
 * @extends net.interfaces.Connector
 */
exports.Connector = Class(net.interfaces.Connector, function() {
	this.connect = function() {
		
		var conn = nodeTcp.createConnection(this._opts.port, this._opts.host);
		conn.addListener("connect", bind(this, function() {
			this.onConnect(new Transport(conn));
		}))
//		conn.addListener("close", bind(this, function() {
//			this.onDisconnect();
//		}))
//		conn.addListener("receive", bind(this._protocol, 'dataReceived'));
		this._opts.encoding = 'plain';
		conn.setEncoding("binary");
		if (typeof this._opts.timeout == 'number') { conn.setTimeout(this._opts.timeout); }
	}
});

/**
 * @extends net.interfaces.Listener
 */
exports.Listener = Class(net.interfaces.Listener, function(supr) {
	this.listen = function() {
		var s = nodeTcp.createServer(bind(this, function(socket) {
			if (typeof this._opts.timeout == 'number') { socket.setTimeout(this._opts.timeout) }
			socket.setEncoding("utf8");
			socket.addListener("connect", bind(this, function() {
		   		this.onConnect(new Transport(socket));
   			}));
   		}));
		
		var listenString = (this._opts['interface'] || "") + ":" + this._opts.port;
		// TODO: Show class name
		logger.info("Listening tcp@" + listenString);
		s.listen(this._opts.port, this._opts['interface'] || "");
	}
});
