jsio('import net.interfaces');
jsio('from .csp.server import createServer');

var Transport = Class(net.interfaces.Transport, function() {
	this.init = function(socket) {
		this._socket = socket;
		logger.debug('init', socket);
	}

	this.makeConnection = function(protocol) {
		logger.debug('makeConnection:', protocol);
		this._socket.addListener("receive", bind(protocol, 'dataReceived'));

		this._socket.addListener("eof", this._socket.close);
		this._socket.addListener("close", bind(protocol, 'connectionLost')); // TODO: map error codes
	}

	this.write = function(data) {
		this._socket.send(data);
	}

	this.loseConnection = function() {
		this._socket.forceClose();
	}
});

exports.Listener = Class(net.interfaces.Listener, function(supr) {
	this.listen = function() {
		var s = createServer(bind(this, function(socket) {
			logger.info("Incoming connection");
			socket.setEncoding("utf8");
			socket.addListener("connect", bind(this, function() {
				this.onConnect(new Transport(socket));
			}));
		}));
		this._cspServer = s;
		var listenString = (this._opts.interface || "" ) + ":" + this._opts.port;
		// TODO: Show class name
		if (!this._opts.skipListen) {
			logger.info("Listening csp@" + listenString);
			s.listen(this._opts.port, this._opts.interface || "");
		}
	}
});
