jsio('import net.interfaces');
jsio('from util.browser import $');

exports.Listener = Class(net.interfaces.Listener, function(supr) {
	var ID = 0;
	
	this.init = function() {
		supr(this, 'init', arguments);
		this._clients = {};
		if (!this._opts.clientUrl) {
			this._opts.clientUrl = jsio.__dir + '/networkConsole.html';
		}
	}

	this.listen = function() {
		$.onEvent(window, 'message', bind(this, '_onMessage'));
	}

	this.getButton = function(url, text) { 
		var button = document.createElement('button');
		button.className = 'clientButton';
		button.innerHTML = text || 'launch client';
		$.onEvent(button, 'click', bind(this, '_openWindow', url));
		return button; 
	}
	
	var uniqueId = 1;
	this._openWindow = function(url) {
		var options = { menubar: 'no', location: 'no', toolbar: 'no',
			width: 550, height: 350, // left: 200, top: 200,
			scrollbars: 'yes', status: 'yes', resizable: 'yes' };
		
		var arr = [];
		for (var i in options) { arr.push(i + '=' + options[i]) }
		var win = window.open(url, 'W' + uniqueId++, arr.join(','));
		win.focus();
	}
	
	this._onMessage = function(evt) {
		var name = evt.source.name;
		var target = this._clients[name];
		var data = eval('(' + evt.data + ')');
		switch (data.type) {
			case 'open':
				this._clients[name] = new exports.Transport(evt.source);
				evt.source.postMessage('{type:"open"}','*');
				this.onConnect(this._clients[name]);
				break;
			case 'data':
				target.onData(data.payload);
				break;
			case 'close':
				target.onClose();
				evt.source.postMessage('{type:"close"}','*');
				delete this._clients[name];
				break;
		}
	}
});

exports.Connector = Class(net.interfaces.Connector, function() {
	this.connect = function() {
		$.onEvent(window, 'message', bind(this, '_onMessage'));
		window.opener.postMessage(JSON.stringify({type:"open"}), '*');
	}
	
	this._onMessage = function(evt) {
		var data = eval('(' + evt.data + ')');
		switch(data.type) {
			case 'open':
				this._transport = new exports.Transport(evt.source);
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

exports.Transport = Class(net.interfaces.Transport, function() {
	this.init = function(win) {
		this._win = win;
	}
	
	this.makeConnection = function(protocol) {
		this._protocol = protocol;
	}
	
	this.write = function(data, encoding) {
		if (this.encoding == 'utf8') {
			this._win.postMessage(JSON.stringify({type: 'data', payload: utf8.encode(data)}), '*');
		} else {
			this._win.postMessage(JSON.stringify({type: 'data', payload: data}), '*');
		} 
	}
	
	this.loseConnection = function(protocol) {
		this._win.postMessage(JSON.stringify({type: 'close', code: 301}), '*');
	}
	
	this.onData = function() { this._protocol.dataReceived.apply(this._protocol, arguments); }
	this.onClose = function() { this._protocol.connectionLost.apply(this._protocol, arguments); }
});
