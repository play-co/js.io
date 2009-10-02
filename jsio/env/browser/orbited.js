jsio('import Class, bind, jsio.logging, jsio.interfaces')

var logger = jsio.logging.getLogger('env.browser.orbited')
exports.Connector = Class(jsio.interfaces.Connector, function() {
	this.connect = function() {
        logger.debug('create Orbited.TCPSocket');
        var conn = new Orbited.TCPSocket();
        conn.onopen = bind(this, function() {
            logger.debug('conn has opened');
        	this.onConnect(new Transport(conn));
        });
        conn.onclose = bind(this, function(code) {
            logger.debug('conn closed without opening, code:', code);
        })
        logger.debug('open the conection');
        conn.open(this._opts.hostname, this._opts.port);
	}
});

var Transport = Class(jsio.interfaces.Transport, function() {
	this.init = function(socket) {
        this._socket = socket;
	}
	
	this.makeConnection = function(protocol) {
        this._socket.onread = bind(protocol, 'dataReceived');
        this._socket.onclose = bind(protocol, 'connectionLost'); // TODO: map error codes
	}
	
	this.write = function(data, encoding) {
        this._socket.send(data);
	}
	
	this.loseConnection = function(protocol) {
        this._socket.close();
	}	
});
