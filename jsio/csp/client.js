jsio('import jsio.std.base64 as base64');
jsio('import jsio.std.utf8 as utf8');
jsio('import jsio.std.uri as uri'); 
jsio('import jsio.logging');
jsio('import .errors');
jsio('import .transports');

var logger = jsio.logging.getLogger("csp.client");
var READYSTATE = exports.READYSTATE = {
	INITIAL: 0,
	CONNECTING: 1,
	CONNECTED:    2,
	DISCONNECTING: 3,
	DISCONNECTED:  4
};


exports.CometSession = Class(function(supr) {
	var id = 0;
	var kDefaultBackoff = 50;
	var kDefaultTimeoutInterval = 45000;
	var kDefaultHandshakeTimeout = 10000;
	this.init = function() {
		this._id = ++id;
		this._url = null;
		this.readyState = READYSTATE.INITIAL;
		this._sessionKey = null;
		this._transport = null;
		this._options = null;
		
		this._utf8ReadBuffer = "";
		this._writeBuffer = "";
		
		this._packetsInFlight = null;
		this._lastEventId = null;
		this._lastSentId = null;
		
		this._handshakeLater = null;
		this._handshakeBackoff = kDefaultBackoff;
		this._handshakeRetryTimer = null;
		this._handshakeTimeoutTimer = null;

		this._timeoutTimer = null;

		
		this._writeBackoff = kDefaultBackoff;
		this._writeRetryTimer = null;
		
		this.cometBackoff = kDefaultBackoff;
		this._cometRetryTimer = null;
		
	}
	
	
	this.setEncoding = function(encoding) {
		if (encoding == this._options.encoding) { 
			return; 
		}
		if (encoding != 'utf8' && encoding != 'plain') {
			throw new errors.InvalidEncodingError();
		}
		if (encoding == 'plain' && this._buffer) {
			var buffer = this._utf8ReadBuffer;
			this._utf8ReadBuffer = "";
			this._doOnRead(buffer);
		}
		this._options.encoding = encoding;
	}


	this.connect = function(url, options) {
		this._url = url;
		this._options = options || {};
		
		this._options.encoding = this._options.encoding || 'utf8';
		this.setEncoding(this._options.encoding); // enforce encoding constraints
		
		this._options.connectTimeout = this._options.connectTimeout || kDefaultHandshakeTimeout;
		
		var transportClass = transports.chooseTransport(url, this._options);
		this._transport = new transportClass();
		
		this._transport.handshakeFailure = bind(this, this._handshakeFailure);
		this._transport.handshakeSuccess = bind(this, this._handshakeSuccess);
		
		this._transport.cometFailure = bind(this, this._cometFailure);
		this._transport.cometSuccess = bind(this, this._cometSuccess);
		
		this._transport.sendFailure = bind(this, this._writeFailure);
		this._transport.sendSuccess = bind(this, this._writeSuccess);
		this.readyState = READYSTATE.CONNECTING;
		this._transport.handshake(this._url, this._options);
		this._handshakeTimeoutTimer = setTimeout(bind(this, this._handshakeTimeout), 
			this._options.connectTimeout);
	}

	this.write = function(data, encoding) {
		if (this.readyState != READYSTATE.CONNECTED) {
			throw new errors.ReadyStateError();
		}
		encoding = encoding || this._options.encoding || 'utf8';
		if (encoding == 'utf8') {
			data = utf8.encode(data);
		}
		this._writeBuffer += data;
		this._doWrite();
	}
	this.close = function(err) {
		switch(this.readyState) {
			case READYSTATE.CONNECTING:
				clearTimeout(this._handshakeRetryTimer);
				clearTimeout(this._handshakeTimeoutTimer);
				break;
			case READYSTATE.CONNECTED:
				this._transport.abort();
				clearTimeout(this._cometRetryTimer);
				clearTimeout(this._writeRetryTimer);
				clearTimeout(this._timeoutTimer);
				break;
			case READYSTATE.DISCONNECTED:
				throw new errors.ReadyStateError("Session is already disconnected");
				break;
		}
		this._doOnDisconnect(err);
	}

	
	this._handshakeTimeout = function() {
		logger.debug('handshake timeout');
		this._handshakeTimeoutTimer = null;
		this._doOnDisconnect(new errors.HandshakeTimeout());
	}
	
	this._handshakeSuccess = function(d) {
		logger.debug('handshake success', d);
		if (this.readyState != READYSTATE.CONNECTING) { 
			logger.debug('received handshake success in invalid readyState:', this.readyState);
			return; 
		}
		clearTimeout(this._handshakeTimeoutTimer);
		this._handshakeTimeoutTimer = null;
		this._sessionKey = d.session;
		this._opened = true;
		this.readyState = READYSTATE.CONNECTED;
		this._doOnConnect();
		this._doConnectComet();
	}
	
	this._handshakeFailure = function(e) {
		logger.debug('handshake failure', e);
		if (this.readyState != READYSTATE.CONNECTING) { return; }
		this._handshakeRetryTimer = setTimeout(bind(this, function() {
			this._handshakeRetryTimer = null;
			this._transport.handshake(this._url, this._options);
		}), this._handshakeBackoff);
		
		this._handshakeBackoff *= 2;
	}
	
	this._writeSuccess = function() {
		if (this.readyState != READYSTATE.CONNECTED) { return; }
		this._resetTimeoutTimer();
		this.writeBackoff = kDefaultBackoff;
		this._packetsInFlight = null;
		if (this._writeBuffer) {
			this._doWrite();
		}
	}
	
	this._writeFailure = function() {
		if (this.readyState != READYSTATE.CONNECTED) { return; }
		this._writeTimer = setTimeout(bind(this, function() {
			this._writeTimer = null;
			this._doWrite();
		}), this._writeBackoff);
		this._writeBackoff *= 2;
	}	
	
	this._doWrite = function() {
		logger.debug('_writeBuffer:', this._writeBuffer);
//		return;
		var newPacket = this._transport.encodePacket(++this._lastSentId, this._writeBuffer, this._options);
		this._writeBuffer = "";
		logger.debug('newPacket:', newPacket);
		if (!this._packetsInFlight) {
			this._packetsInFlight = [newPacket];
		}
		logger.debug('json packets:', JSON.stringify(this._packetsInFlight));
		this._transport.send(this._url, this._sessionKey, JSON.stringify(this._packetsInFlight), this._options);
	}
	
	this._doConnectComet = function() {
		logger.debug('_doConnectComet');
//		return;
		this._transport.comet(this._url, this._sessionKey, this._lastEventId || 0, this._options);
	}

	this._cometFailure = function() {
		if (this.readyState != READYSTATE.CONNECTED) { return; }
		this._cometTimer = setTimeout(bind(this, function() {
			this._doConnectComet();
		}), this._cometBackoff);
		this._cometBackoff *= 2;
	}
	
	this._cometSuccess = function(packets) {
		if (this.readyState != READYSTATE.CONNECTED) { return; }
		logger.debug('comet Success:', packets);
		this._cometBackoff = kDefaultBackoff;
		this._resetTimeoutTimer();
		for (var i = 0,  packet; (packet = packets[i]) || i < packets.length; i++) {
			logger.debug('process packet:', packet);
			if (packet === null) {
				return self._doClose();
			}
			logger.debug('process packet', packet);
			var ackId = packet[0];
			var encoding = packet[1];
			var data = packet[2];
			if (typeof(this._lastEventId) == 'number' && ackId <= this._lastEventId) {
				continue;
			}
			if (typeof(this._lastEventId) == 'number' && ackId != this._lastEventId+1) {
				return this._doClose(new errors.ServerProtocolError(201));
			}
			this._lastEventId = ackId;
			if (encoding == 1) { // base64 encoding
				try {
					logger.debug('before base64 decode:', data);
					data = base64.decode(data);
					logger.debug('after base64 decode:', data);
				} catch(e) {
					return this._doClose(new errors.ServerProtocolError(202));
				}
			}
			if (this._options.encoding == 'utf8') {
				// TODO: need an incremental utf8 decoder for this stuff.
				this._utf8ReadBuffer += data;
				logger.debug('before utf8 decode, _utf8ReadBuffer:', this._utf8ReadBuffer);
				var result = utf8.decode(this._utf8ReadBuffer);
				data = result[0];
				this._utf8ReadBuffer = this._utf8ReadBuffer.slice(result[1]);
				logger.debug('after utf8 decode, _utf8ReadBuffer:', this._utf8ReadBuffer, 'data:', data );
			}
			logger.debug('dispatching data:', data);
			try {
				this._doOnRead(data);
			} catch(e) {
				logger.error('application code threw an error. (re-throwing in timeout):', e);
				// throw the error later
				setTimeout(function() {
					logger.debug('timeout fired, throwing error', e);
					throw e;
				}, 0);
			}
		}
		// reconnect comet last, after we process all of the packet ids
		this._doConnectComet();
		
	}

	this._doOnRead = function(data) {
		if (typeof(this.onread) == 'function') {
			logger.debug('call onread function', data);
			this.onread(data);
		}
		else {
			logger.debug('skipping onread callback (function missing)');
		}
	}
	
	this._doOnDisconnect = function(err) {
		if (typeof(this.ondisconnect) == 'function') {
			logger.debug('call ondisconnect function', err);
			this.ondisconnect(err);
		}
		else {
			logger.debug('skipping ondisconnect callback (function missing)');
		}
	}
	
	this._doOnConnect = function() {
		if (typeof(this.onconnect) == 'function') {
			logger.debug('call onconnect function');
			try {
				this.onconnect();
			} catch(e) {
				logger.debug('onconnect caused errror', e);
				// throw error later
				setTimeout(function() { throw e }, 0);
			}
		}
		else {
			logger.debug('skipping onconnect callback (function missing)');
		}
	}

	this._resetTimeoutTimer = function() {
		clearTimeout(this._timeoutTimer);
		this._timeoutTimer = setTimeout(bind(this, function() {
			logger.debug('connection timeout expired');
			this.close(new errors.SessionTimeout())
		}), this._getTimeoutInterval())
	}
	
	this._getTimeoutInterval = function() {
		return kDefaultTimeoutInterval;
	}

})



