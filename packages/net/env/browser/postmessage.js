import net.interfaces;
from util.browser import $;
import std.uuid;

/**
 * @extends net.interfaces.Listener
 */
exports.Listener = Class(net.interfaces.Listener, function(supr) {
	var ID = 0;
	
	this.init = function() {
		supr(this, 'init', arguments);
		this._clients = {};
		if (!this._opts.clientUrl) {
			this._opts.clientUrl = jsio.__dir + '/networkConsole.html';
		}

		this._port = '' + (this._opts.port || '');
	}

	this.listen = function() {
		$.onEvent(window, 'message', bind(this, '_onMessage'));
	}

	this.getButton = function(url, text) {
		var button = $({
			tagName: 'button',
			text: text || 'launch client',
			className: 'clientButton'
		});
		$.onEvent(button, 'click', bind(this, 'openWindow', url || this._opts.clientUrl));
		return button; 
	}
	
	var uniqueId = 1;
	this.openWindow = function (url) {
		var options = { menubar: 'no', location: 'no', toolbar: 'no',
			width: 550, height: 350, // left: 200, top: 200,
			scrollbars: 'yes', status: 'yes', resizable: 'yes' };
		
		var arr = [];
		for (var i in options) { arr.push(i + '=' + options[i]) }
		var win = window.open(url, 'W' + uniqueId++, arr.join(','));
		win.focus();
	}
	
	this._onMessage = function (evt) {
		if (this._port != evt.data.substring(0, this._port.length)) { return; }
		var data = evt.data.substring(this._port.length);

		try {
			data = JSON.parse(data);
		} catch (e) {
			logger.warn('invalid packet', evt.data);
			return;
		}

		switch (data.type) {
			case 'open':
				var transport = this._clients[data.id] = new exports.Transport(evt.source, this._port);
				evt.source.postMessage(this._port + '{"type":"open"}','*');
				this.onConnect(transport);
				break;
			case 'data':
				var transport = this._clients[data.id];
				if (transport) { transport.onData(data.payload); }
				break;
			case 'close':
				var transport = this._clients[data.id];
				if (transport) { transport.onClose(); }
				evt.source.postMessage(this._port + '{"type":"close"}','*');
				delete this._clients[data.id];
				break;
		}
	}
});

/**
 * @extends net.interfaces.Connector
 */
exports.Connector = Class(net.interfaces.Connector, function() {
	this.connect = function() {
		this._port = '' + (this._opts.port || '');
		this._win = this._opts.win || window.opener || window.parent;
		$.onEvent(window, 'message', bind(this, '_onMessage'));

		this._uid = std.uuid.uuid();
		this._win.postMessage(this._port + JSON.stringify({type: 'open', id: this._uid}), '*');
	}
	
	this._onMessage = function(evt) {
		if (this._port != evt.data.substring(0, this._port.length)) { return; }
		var data = evt.data.substring(this._port.length);

		try {
			data = JSON.parse(data);
		} catch (e) {
			logger.warn('invalid packet', evt.data);
			return;
		}

		switch (data.type) {
			case 'open':
				this._transport = new exports.Transport(evt.source, this._port, this._uid);
				this.onConnect(this._transport);
				break;
			case 'close':
				this._transport.onClose();
				break;
			case 'data':
				this._transport.onData(data.payload);
				break;
		}
	}
});

/**
 * @extends net.interfaces.Transport
 */
exports.Transport = Class(net.interfaces.Transport, function() {
	this.init = function (win, port, uid) {
		this._win = win;
		this._port = port;
		this._uid = uid; // unique identifier for clients
	}
	
	this.makeConnection = function (protocol) {
		this._protocol = protocol;
	}
	
	this.write = function (data, encoding) {
		if (this.encoding == 'utf8') {
			this._win.postMessage(this._port + JSON.stringify({type: 'data', id: this._uid, payload: utf8.encode(data)}), '*');
		} else {
			this._win.postMessage(this._port + JSON.stringify({type: 'data', id: this._uid, payload: data}), '*');
		} 
	}
	
	this.loseConnection = function (protocol) {
		this._win.postMessage(this._port + JSON.stringify({type: 'close', id: this._uid, code: 301}), '*');
	}
	
	this.onData = function () { this._protocol.dataReceived.apply(this._protocol, arguments); }
	this.onClose = function () { this._protocol._connectionLost.apply(this._protocol, arguments); }
});
