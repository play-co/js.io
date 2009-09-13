jsio.require('jsio', ['Class', 'log']);
jsio.require('jsio.interfaces');

var Transport = Class(jsio.interfaces.Transport, function() {
    this.init = function(socket) {
        this._socket = socket;
    }

    this.makeConnection = function(protocol) {
		this._socket.addListener("receive", jsio.bind(protocol, 'dataReceived'));
		this._socket.addListener("eof", jsio.bind(protocol, 'connectionLost')); // TODO: map error codes
		// this._socket.addListener("close", jsio.bind(protocol, 'connectionLost')); // TODO: map error codes
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
    	var s = node.tcp.createServer(jsio.bind(this, function(socket) {
		    socket.setEncoding("utf8");
		    socket.addListener("connect", jsio.bind(this, function() {
           		this.onConnect(new Transport(socket));
   			}));
   		}));
        s.listen(this._opts.port, this._opts.interface || "");
	}
});
