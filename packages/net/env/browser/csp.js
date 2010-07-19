jsio('import net.interfaces');
jsio('from net.csp.client import CometSession');
jsio('import std.utf8 as utf8');

exports.Connector = Class(net.interfaces.Connector, function() {
	this.connect = function() {
		this._state = net.interfaces.STATE.CONNECTING;
		
		var conn = new CometSession();
		conn.onconnect = bind(this, 'cometSessionOnConnect', conn);
		conn.ondisconnect = bind(this, 'onDisconnect');
		
		logger.debug('opening the connection');
		this._opts.encoding = 'plain';
		var url = this._opts.url;
		delete this._opts.url;
		conn.connect(url, this._opts);//{encoding: 'plain'});
	}
	
	this.cometSessionOnConnect = function(conn) {
		logger.debug('conn has opened');
		this.onConnect(new Transport(conn));
	}
});

var Transport = Class(net.interfaces.Transport, function() {
	this.init = function(conn) {
		this._conn = conn;
	}
	
	this.makeConnection = function(protocol) {
		this._conn.onread = bind(protocol, 'dataReceived');
	}
	
	this.write = function(data) {
		this._conn.write(this._encoding == 'utf8' ? utf8.encode(data) : data);
	}
	
	this.loseConnection = function(protocol) {
		this._conn.close();
	}
});
