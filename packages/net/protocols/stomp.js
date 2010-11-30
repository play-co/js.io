jsio('from net.protocols.buffered import BufferedProtocol');
jsio('from util.sprintf import sprintf');

exports.StompProtocol = Class(BufferedProtocol, function(supr) {

	this.init = function() {
		supr(this, 'init', []);
		this.state = 'peek';
	}

	this.connect = function(username, password) {
		var frame = new StompFrame('CONNECT')
		if (!!username)
			frame.setHeader('login', username);
		if (!!password)
			frame.setHeader('passcode', password);
		this.sendFrame(frame);
	}

	this.send = function(destination, body, headers) {
		var frame = new StompFrame('SEND', body, headers)
		frame.setHeader('destination', destination);
		this.sendFrame(frame);
	}

	this.subscribe = function(destination, headers) {
		var frame = new StompFrame('SUBSCRIBE', null, headers)
		frame.setHeader('destination', destination);
		this.sendFrame(frame);
	}
	this.unsubscribe = function(destination, headers) {
		var frame = new StompFrame('UNSUBSCRIBE', null, headers)
		frame.setHeader('destination', destination);
		this.sendFrame(frame);
	}

	this.sendFrame = function(frame) {
		this.transport.write(frame.serialize());
	}

	this.frameReceived = function(frame) {
		logger.info('frame received', frame);
	}
	
	this.bufferUpdated = function() {
		logger.debug('bufferUpdated');
		var counter = 0;
		while (++counter < 10) {
			switch(this.state) {
				case 'peek':
					if (this.buffer.peekBytes(1) == '\n') {
						logger.debug('consuming a single \n byte')
						this.buffer.consumeBytes(1)
					}
					this.state = 'method';
					/* FALL THROUGH */
				case 'method':
					logger.debug('case method');
					// Fix for stomp servers that send extra \n byte
					if (!this.buffer.hasLine())
						return;
					this._frame = new StompFrame();
					var method = this.buffer.consumeThroughDelimiter();
					logger.debug('method is', JSON.stringify(method));
					this._frame.setMethod(method);
					this.state = 'headers';
					/* FALL THROUGH */
				case 'headers':
					logger.debug('case headers');
					var M = 0;
					while (this.buffer.hasLine() && ++M < 10) {
						var line = this.buffer.consumeThroughDelimiter();
						if (line.length == 0) {
							this.state = 'body';
							break;
						}
						var segments = line.split(':')
						var key = segments[0];
						// I guess we allow ": " in the header value.
						var value = segments.slice(1).join(':')
						while (value[0] == ' ') value = value.slice(1);
						while (value[1] == ' ') value = value.slice(0, value.length-1);
						logger.debug('add header', key, value);
						this._frame.setHeader(key, value);
					}
					if (this.state == 'headers')
						return;
					/* FALL THROUGH */
				case 'body':
					if (this._frame.getBodyMode() == 'length') {
						if (!this.buffer.hasBytes(this._frame.getContentLength()+1))
							return
						this._frame.setBody(this.buffer.consumeBytes(this._frame.getContentLength()))
						// Remove trailing \x00
						this.buffer.consumeBytes(1)
					}
					else {
						if (!this.buffer.hasLine('\x00'))
							return
						this._frame.setBody(this.buffer.consumeThroughDelimiter('\x00'));
					}
					this.frameReceived(this._frame);
					this._frame = null;
					this.state = 'peek';
					/* FALL THROUGH and LOOP */
			}
		}
		
	}

})

var StompFrame = exports.StompFrame = Class(function() {

	this.init = function(_method, _body, _headers) {
		this._headers = !!_headers ? _headers : {}
		this._method = !!_method ? _method : null
		this._body = !!_body ? _body : "";
	}
	this.setHeader = function(key, val) {
		this._headers[key] = val;
	}
	this.getHeader = function(key) {
		return this._headers[key];
	}
	this.getHeaders = function() {
		return this._headers;
	}
	this.setMethod = function(m) {
		// TODO: enforce method constraints here?
		//	   -mcarter 9/18/09
		this._method = m;
	}
	this.getMethod = function() {
		return this._method;
	}
	this.setBody = function(b) {
		this._body = b;
	}
	this.getbody = function() {
		return this._body;
	}
	this.toString = function() {
		var i = 0;
		for (var key in this._headers) {
			++i;
		}
		return sprintf("[StompFrame method(%s), num-headers(%d), body-length(%d)]", 
					   this._method, i, this._body.length);
	}
	this.getContentLength = function() {
		return parseInt(this._headers['content-length']);
	}
	this.getBodyMode = function() {
		if ('content-length' in this._headers) {
			return 'length';
		}
		return 'delimited';
	}
	this.serialize = function() {
		var output = this._method + '\n'
		for (var key in this._headers) {
			output += key + ': ' + this._headers[key] + '\n';
		}
		output += 'content-length: ' + this._body.length + '\n';
		output += '\n';
		output += this._body;
		output += '\x00'
		return output;
	}
});
