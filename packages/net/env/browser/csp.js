jsio('import net.interfaces');
jsio('from net.csp.client import CometSession');
jsio('import std.utf8 as utf8');

exports.Connector = Class(net.interfaces.Connector, function() {
	this.connect = function() {
		var conn = new CometSession();
		conn.onconnect = bind(this, function() {
			logger.debug('conn has opened');
			this.onConnect(new Transport(conn));
		});
		conn.ondisconnect = bind(this, function(code) {
			this.onConnectFailure('csp');
		});
		logger.debug('open the conection');
		this._opts.encoding = 'plain';
		var url = this._opts.url;
		delete this._opts.url;
		conn.connect(url, this._opts);//{encoding: 'plain'});
	}
});

var Transport = Class(net.interfaces.Transport, function() {
	this.init = function(conn) {
		this._conn = conn;
	}
	
	this.makeConnection = function(protocol) {
		this._conn.onread = bind(protocol, 'dataReceived');
		this._conn.ondisconnect = bind(protocol, 'connectionLost'); // TODO: map error codes
	}
	
	this.write = function(data) {
		
		if (this._encoding == 'utf8') {
			this._conn.write(utf8.encode(data));
		} else {
			this._conn.write(data);
		} 
	}
	
	this.loseConnection = function(protocol) {
		this._conn.close();
	}
});
