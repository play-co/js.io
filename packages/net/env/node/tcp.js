jsio('from base import *');
jsio('import net.interfaces, logging');

var nodeTcp = jsio.__env.require('tcp');
var logger = logging.getLogger('node.tcp');

var Transport = Class(net.interfaces.Transport, function() {
	this.init = function(socket) {
		this._socket = socket;
	}

	this.makeConnection = function(protocol) {
		this._socket.addListener("receive", bind(protocol, 'dataReceived'));
		this._socket.addListener("close", bind(protocol, 'connectionLost')); // TODO: map error codes
		this._socket.addListener("eof", this._socket.close);
	}

	this.write = function(data) {
		this._socket.send(data);
	}

	this.loseConnection = function() {
		this._socket.forceClose();
	}
});


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
	}
});

exports.Listener = Class(net.interfaces.Listener, function(supr) {
	this.listen = function() {
		var s = nodeTcp.createServer(bind(this, function(socket) {
			socket.setEncoding("utf8");
			socket.addListener("connect", bind(this, function() {
		   		this.onConnect(new Transport(socket));
   			}));
   		}));
		var listenString = (this._opts.interface || "" ) + ":" + this._opts.port;
		// TODO: Show class name
		logger.info("Listening tcp@" + listenString);
		s.listen(this._opts.port, this._opts.interface || "");
	}
});
