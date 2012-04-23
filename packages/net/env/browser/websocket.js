jsio('import net.interfaces');
jsio('import std.utf8 as utf8');
jsio('import net.errors as Errors');

/**
 * @extends net.interfaces.Connector
 */
exports.Connector = Class(net.interfaces.Connector, function() {
	this.connect = function() {
		this._state = net.interfaces.STATE.CONNECTING;
		
		var url = this._opts.url,
		 	ctor = this._opts.wsConstructor || window.WebSocket;
	
		logger.info('this._opts', this._opts);
		
		var ws = new ctor(url);
		ws.onopen = bind(this, 'webSocketOnOpen', ws);
		ws.onclose = bind(this, 'webSocketOnClose', ws);
	}
	
	this.webSocketOnOpen = function(ws) {
		this.onConnect(new Transport(ws));
	}
	
	this.webSocketOnClose = function(ws, e) {
		var err,
			data = {rawError: e, webSocket: ws};
		if (e.wasClean) {
			err = new Errors.ServerClosedConnection('WebSocket Connection Closed', data);
		} else {
			if (this._state == net.interfaces.STATE.CONNECTED) {
				err = new Errors.ConnectionTimeout('WebSocket Connection Timed Out', data);
			} else {
				err = new Errors.ServerUnreachable('WebSocket Connection Failed', data);
			}
		}
		
		logger.debug('conn closed', err);
		this.onDisconnect(err);
	}
});

var Transport = Class(net.interfaces.Transport, function() {
	
	this.init = function(ws) {
		this._ws = ws;
	}
	
	this.makeConnection = function(protocol) {
		this._ws.onmessage = function(data) {
			var payload = utf8.encode(data.data);
			protocol.dataReceived(payload);
		}
	}
	
	this.write = function(data, encoding) {
		if (this._encoding == 'plain') {
			result = utf8.decode(data);
			data = result[0];
		}
		this._ws.send(data);
	}
	
	this.loseConnection = function(protocol) {
		this._ws.close();
	}
});
