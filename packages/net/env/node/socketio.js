import ...interfaces;

var Transport = Class(interfaces.Transport, function() {
	this.init = function(socket) {
		this._socket = socket;
		logger.debug('init', socket);
	}

	this.makeConnection = function(protocol) {
		logger.debug('makeConnection:', protocol);
		this._socket.on("message", bind(protocol, 'dataReceived'));
		this._socket.on("disconnect", bind(protocol, '_connectionLost'));
	}

	this.write = function(data) {
		this._socket.send(data);
	}

	this.loseConnection = function() {
		this._socket.close();
	}
});

/**
 * @extends net.interfaces.Listener
 */
exports.Listener = Class(interfaces.Listener, function(supr) {
	this.listen = function () {
		if (this._opts.port) {
			// if a port is provided, create an http server and host socket.io
			// at the specified port
			var server = require('http').Server();
			server.listen(this._opts.port);
			this._ioServer = this._opts.io(server);
		} else if (this._opts.io) {
			// if an io server is already setup
			if (this._opts.namespace) {
				// use the url as a namespace
				this._ioServer = this._opts.io.of(this._opts.namespace);
			} else {
				this._ioServer = this._opts.io;
			}
		}

		if (this._ioServer) {
			this._ioServer.on('connection', bind(this, '_onConnect'));
		} else {
			logger.warn('socket.io not setup properly: please provide an io instance or an http port to the net.listen opts');
		}
	}

	this._onConnect = function (socket) {
		logger.info("Incoming connection");
		this.onConnect(new Transport(socket));
	}
});
