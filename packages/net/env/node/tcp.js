import ...interfaces;
var net = require('net');

var Transport = Class(interfaces.Transport, function() {
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
		this._socket.end();
	}
});

/**
 * @extends net.interfaces.Connector
 */
exports.Connector = Class(interfaces.Connector, function() {
	this.connect = function() {

		var conn = net.createConnection(this._opts.port, this._opts.host);
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
exports.Listener = Class(interfaces.Listener, function(supr) {
	this.listen = function() {
		var s = net.createServer(bind(this, function(socket) {
			if (typeof this._opts.timeout == 'number') {
				socket.setTimeout(this._opts.timeout)
			}

			socket.setEncoding("utf8");
			this.onConnect(new Transport(socket));
		}));

		var listenString = (this._opts['interface'] || "") + ":" + this._opts.port;
		// TODO: Show class name
		logger.info("Listening tcp@" + listenString);
		s.listen(this._opts.port, this._opts['interface'] || "")
			.on('error', bind(this, function (err) {
				logger.error(err);
				this.emit('error', err);
			}));
	}
});
