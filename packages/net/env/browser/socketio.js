import lib.Callback;
import net.interfaces;
import std.utf8 as utf8;
logger.setLevel(0);
var _script;
var _scriptOnLoad = new lib.Callback();

/**
 * @extends net.interfaces.Connector
 */
exports.Connector = Class(net.interfaces.Connector, function() {
	this.connect = function() {
		this._state = net.interfaces.STATE.CONNECTING;

		var url = this._opts.url || '/';
		if (!/\/$/.test(url)) { url += '/'; }

		if (typeof io != 'function' && typeof document != 'undefined') {
			_script = document.createElement('script');
			_script.onload = _script.onreadystatechange = function () {
				if (typeof io == 'function') {
					_script.onload = _script.onreadystatechange = null;
					_scriptOnLoad.fire(io);
				}
			};

			_script.src = '/socket.io/socket.io.js';
			document.getElementsByTagName('head')[0].appendChild(_script);
		} else if (!_scriptOnLoad.hasFired()) {
			_scriptOnLoad.fire(io);
		}

		_scriptOnLoad.run(bind(this, '_connect'));
	}

	this._connect = function (io) {
		logger.debug('opening the connection');
		var socket = io(this._opts.namespace);
		socket.on('connect', bind(this, function () {
			this.onConnect(new Transport(socket));
		}));
		socket.on('disconnect', bind(this, 'onDisconnect'));
	}
});

var Transport = Class(net.interfaces.Transport, function() {
	this.init = function(socket) {
		this._socket = socket;
	}

	this.makeConnection = function(protocol) {
		this._socket.on('message', bind(protocol, 'dataReceived'));
	}

	this.write = function(data) {
		this._socket.send(data);
	}

	this.loseConnection = function(protocol) {
		this._socket.close();
	}
});
