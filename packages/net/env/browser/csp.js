import ...interfaces;
from ...csp.client import CometSession;
import ....std.utf8 as utf8;

/**
 * @extends net.interfaces.Connector
 */
exports.Connector = Class(interfaces.Connector, function() {
	this.connect = function() {
		this._state = interfaces.STATE.CONNECTING;

		var conn = new CometSession();
		conn.onconnect = bind(this, 'cometSessionOnConnect', conn);
		conn.ondisconnect = bind(this, 'onDisconnect');

		logger.debug('opening the connection');
		if (!this._opts.encoding) { this._opts.encoding = 'utf8'; }
		conn.connect(this._opts.url, this._opts);//{encoding: 'plain'});
	}

	this.cometSessionOnConnect = function(conn) {
		logger.debug('conn has opened');
		this.onConnect(new Transport(conn));
	}
});

var Transport = Class(interfaces.Transport, function() {
	this.init = function(conn) {
		this._conn = conn;
	}

	this.makeConnection = function(protocol) {
		this._conn.onread = bind(protocol, 'dataReceived');
	}

	this.write = function(data) {
		this._conn.write(data);
	}

	this.loseConnection = function(protocol) {
		this._conn.close();
	}
});
