jsio('import net.interfaces');
jsio('import std.utf8 as utf8');

exports.Connector = Class(net.interfaces.Connector, function() {
	this.connect = function() {
		var url = this._opts.url;
		
		var constructor = this._opts.wsConstructor || window.WebSocket;
		logger.info('this._opts', this._opts);
		var ws = new constructor(url);
//		var ws = new constructor(url);
//		JK = constructor;
//		XKCDA = ws;
		ws.onopen = bind(this, function() {
			this.onConnect(new Transport(ws));
		});
		ws.onclose = bind(this, function(code) {
			this.onConnectFailure('websocket');
			logger.debug('conn closed without opening, code:', code);
		});
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
		this._ws.onclose = bind(protocol, 'connectionLost'); // TODO: map error codes
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
