jsio('import std.base64 as base64');
jsio('import std.utf8 as utf8');
jsio('import std.uri as uri'); 
jsio('import net.errors as errors');
jsio('import .transports');
jsio('import lib.Enum as Enum');

var READYSTATE = exports.READYSTATE = Enum({
	INITIAL: 0,
	CONNECTING: 1,
	CONNECTED: 2,
	DISCONNECTING: 3,
	DISCONNECTED:  4
});


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
		this._cometBackoff = kDefaultBackoff;
		
		this._nullInBuffer = false;
		this._nullInFlight= false;
		this._nullSent = false;
		this._nullReceived = false;
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
		this._url = url.replace(/\/$/,'');
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
	
	// Close due to protocol error
	this._protocolError = function(msg) {
		logger.debug('_protocolError', msg);
		// Immediately fire the onclose
		// send a null packet to the server
		// don't wait for a null packet back.
		this.readyState = READYSTATE.DISCONNECTED;
		this._doWrite(true);
		this._doOnDisconnect(new errors.ServerProtocolError(msg));
	}
	
	this._receivedNullPacket = function() {
		logger.debug('_receivedNullPacket');
		// send a null packet back to the server
		this._receivedNull = true;
		
		// send our own null packet back. (maybe)
		if (!(this._nullInFlight || this._nullInBuffer || this._nullSent)) {
			this.readyState = READYSTATE.DISCONNECTING;
			this._doWrite(true);
		}
		else {
			this.readyState = READYSTATE.DISCONNECTED;
		}
		
		// fire an onclose
		this._doOnDisconnect(new errors.ConnectionClosedCleanly());

	}
	
	this._sentNullPacket = function() {
		logger.debug('_sentNullPacket');
		this._nullSent = true;
		if (this._nullSent && this._nullReceived) {
			this.readyState = READYSTATE.DISCONNECTED;
		}
	}
	
	
	// User Calls close
	this.close = function(err) {
		logger.debug('close called', err, 'readyState', this.readyState);

		// 
		switch(this.readyState) {
			case READYSTATE.CONNECTING:
				clearTimeout(this._handshakeRetryTimer);
				clearTimeout(this._handshakeTimeoutTimer);
				this.readyState = READYSTATE.DISCONNECTED;
				this._doOnDisconnect(err);
				break;
			case READYSTATE.CONNECTED:
				this.readyState = READYSTATE.DISCONNECTING;
				this._doWrite(true);
				clearTimeout(this._timeoutTimer);
				break;
			case READYSTATE.DISCONNECTED:
				throw new errors.ReadyStateError("Session is already disconnected");
				break;
		}
		
		
		this._opened = false; // what is this used for???
		this.readyState = READYSTATE.DISCONNECTED;
		
		this._doOnDisconnect(err);
		this._sessionKey = null;
	}
	
	this._handshakeTimeout = function() {
		logger.debug('handshake timeout');
		this._handshakeTimeoutTimer = null;
		clearTimeout(this._handshakeRetryTimer);
		if (this.readyState == READYSTATE.CONNECTING) {
			this.readyState = READYSTATE.DISCONNECTED;
		}
		
		this._doOnDisconnect(new errors.ServerUnreachable());
	}
	
	this._handshakeSuccess = function(data) {
		logger.debug('handshake success', data);
		if (this.readyState != READYSTATE.CONNECTING) { 
			logger.debug('received handshake success in invalid readyState:', this.readyState);
			return; 
		}
		clearTimeout(this._handshakeTimeoutTimer);
		this._handshakeTimeoutTimer = null;
		this._sessionKey = data.response.session;
		this._opened = true;
		this.readyState = READYSTATE.CONNECTED;
		this._doOnConnect();
		this._doConnectComet();
	}
	
	this._handshakeFailure = function(data) {
		logger.debug('handshake failure', data);
		if (this.readyState != READYSTATE.CONNECTING) { return; }
		if (data.status == 404) {
			clearTimeout(this._handshakeTimeoutTimer);
			return this._doOnDisconnect(new errors.ServerUnreachable());
		}
		
		logger.debug('trying again in ', this._handshakeBackoff);
		this._handshakeRetryTimer = setTimeout(bind(this, function() {
			this._handshakeRetryTimer = null;
			this._transport.handshake(this._url, this._options);
		}), this._handshakeBackoff);
		
		this._handshakeBackoff *= 2;
	}
	
	this._writeSuccess = function() {
		if (this.readyState != READYSTATE.CONNECTED && this.readyState != READYSTATE.DISCONNECTING) {
			return;
		}
		if (this._nullInFlight) {
			return this._sentNullPacket();
		}
		this._resetTimeoutTimer();
		this.writeBackoff = kDefaultBackoff;
		this._packetsInFlight = null;
		if (this._writeBuffer || this._nullInBuffer) {
			this._doWrite(this._nullInBuffer);
		}
	}
	
	this._writeFailure = function() {
		if (this.readyState != READYSTATE.CONNECTED && this.READYSTATE != READYSTATE.DISCONNECTING) { return; }
		this._writeTimer = setTimeout(bind(this, function() {
			this._writeTimer = null;
			this.__doWrite(this._nullInBuffer);
		}), this._writeBackoff);
		this._writeBackoff *= 2;
	}	

	this._doWrite = function(sendNull) {
		if (this._packetsInFlight) {
			if (sendNull) {
				this._nullInBuffer = true;
				return; 
			}
			return;
		}
		this.__doWrite(sendNull);
	}
	
	this.__doWrite = function(sendNull) {
		logger.debug('_writeBuffer:', this._writeBuffer);
		if (!this._packetsInFlight && this._writeBuffer) {
			this._packetsInFlight = [this._transport.encodePacket(++this._lastSentId, this._writeBuffer, this._options)];
			this._writeBuffer = "";
		}
		if (sendNull && !this._writeBuffer) {
			if (!this._packetsInFlight) {
				this._packetsInFlight = [];
			}
			this._packetsInFlight.push([++this._lastSentId, 0, null]);
			this._nullInFlight = true;
		}
		if (!this._packetsInFlight) {
			logger.debug("no packets to send");
			return;
		}
		logger.debug('sending packets:', JSON.stringify(this._packetsInFlight));
		this._transport.send(this._url, this._sessionKey, this._lastEventId || 0, JSON.stringify(this._packetsInFlight), this._options);
	}
	
	this._doConnectComet = function() {
		logger.debug('_doConnectComet');
//		return;
		this._transport.comet(this._url, this._sessionKey, this._lastEventId || 0, this._options);
	}

	this._cometFailure = function(data) {
		if (this.readyState != READYSTATE.CONNECTED) { return; }
		if (data.status == 404 && data.response == 'Session not found') {
			return this.close(new errors.ExpiredSession(data));
		}
		
		this._cometTimer = setTimeout(bind(this, '_doConnectComet'), this._cometBackoff);
		this._cometBackoff *= 2;
	}
	
	this._cometSuccess = function(data) {
		if (this.readyState != READYSTATE.CONNECTED && this.readyState != READYSTATE.DISCONNECTING) { return; }
		logger.debug('comet Success:', data);
		this._cometBackoff = kDefaultBackoff;
		this._resetTimeoutTimer();
		
		var response = data.response;
		for (var i = 0, packet; (packet = response[i]) || i < response.length; i++) {
			logger.debug('process packet:', packet);
			if (packet === null) {
				return this.close(new errors.ServerProtocolError(data));
			}
			logger.debug('process packet', packet);
			var ackId = packet[0];
			var encoding = packet[1];
			var data = packet[2];
			if (typeof(this._lastEventId) == 'number' && ackId <= this._lastEventId) {
				continue;
			}
			if (typeof(this._lastEventId) == 'number' && ackId != this._lastEventId+1) {
				return this._protocolError("Ack id too high");
			}
			this._lastEventId = ackId;
			if (data == null) {
				return this._receivedNullPacket();
			}
			if (encoding == 1) { // base64 encoding
				try {
					logger.debug('before base64 decode:', data);
					data = base64.decode(data);
					logger.debug('after base64 decode:', data);
				} catch(e) {
					return this._protocolError("Unable to decode base64 payload");
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

			// TODO: possibly catch this error in production? but not in dev
			this._doOnRead(data);
		}
		
		if (this.readyState != READYSTATE.CONNECTED && this.readyState != READYSTATE.DISCONNECTING) { return; }
		
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
			this.close(new errors.ConnectionTimeout())
		}), this._getTimeoutInterval())
	}
	
	this._getTimeoutInterval = function() {
		return kDefaultTimeoutInterval;
	}

});
