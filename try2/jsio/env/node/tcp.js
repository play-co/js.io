require('jsio', ['Class', 'log', 'bind']);
require('jsio.interfaces');
require('jsio.logging');
var logger = jsio.logging.getLogger('node.tcp');

var Transport = Class(jsio.interfaces.Transport, function() {
    this.init = function(socket) {
        this._socket = socket;
    }

    this.makeConnection = function(protocol) {
		this._socket.addListener("receive", bind(protocol, 'dataReceived'));
		this._socket.addListener("eof", bind(protocol, 'connectionLost')); // TODO: map error codes
		// this._socket.addListener("close", bind(protocol, 'connectionLost')); // TODO: map error codes
    }

    this.write = function(data) {
        this._socket.send(data);
    }

    this.loseConnection = function() {
        this._socket.forceClose();
    }
});

exports.Listener = Class(jsio.interfaces.Listener, function(supr) {
	this.listen = function() {
    	var s = node.tcp.createServer(bind(this, function(socket) {
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
