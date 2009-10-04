jsio('import Class, bind, jsio.logging, jsio.interfaces');

var logger = jsio.logging.getLogger('env.browser.tcp')

exports.Connector = Class(jsio.interfaces.Connector, function() {
	this.connect = function() {
        var conn = new Orbited.TCPSocket();
        conn.onopen = bind(this, function() {
        	this.onConnect(new Transport(conn));
        });
        conn.open(this._opts.hostname, this._opts.port);
	}
});

var Transport = Class(jsio.interfaces.Transport, function() {
    this.init = function(socket) {
        this._socket = socket;
    };
    
    this.makeConnection = function(protocol) {
        this._socket.onread = bind(protocol, 'dataReceived');
        this._socket.onclose = bind(protocol, 'connectionLost'); // TODO: map error codes
    }
    
    this.write = function(data, encoding) {
        this._socket.send(data);
    };

    this.loseConnection = function() {
        this._socket.close();
    };

});

