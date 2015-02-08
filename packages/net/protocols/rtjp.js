from .delimited import DelimitedProtocol;

/**
 * @extends net.protocols.delimited.DelimitedProtocol
 */
exports.RTJPProtocol = Class(DelimitedProtocol, function(supr) {
	this.init = function() {
		var delimiter = '\r\n';
		supr(this, 'init', [delimiter]);
		this.frameId = 0;
	}

	this.connectionMade = function() {
		if (this._client && this._client.connectionMade) { this._client.connectionMade(); }
		logger.debug("connectionMade");
	}

	var error = function(e) {
		logger.error(e);
	}

	// Inherit and overwrite
	this.frameReceived = function(id, name, args) {
	}

	// Public
	this.sendFrame = function(name, args) {
		if (!args) {
			args = {}
		}
		logger.debug('sendFrame', name, JSON.stringify(args));
		this.sendLine(JSON.stringify([++this.frameId, name, args]));
		return this.frameId;
	}

	this.lineReceived = function(line) {
		try {
			var frame = JSON.parse(line);
			if (frame.length != 3) {
				return error.call(this, "Invalid frame length");
			}
			if (typeof(frame[0]) != "number") {
				return error.call(this, "Invalid frame id");
			}
			if (typeof(frame[1]) != "string") {
				return error.call(this, "Invalid frame name");
			}
			logger.debug("frameReceived:", frame[0], frame[1], JSON.stringify(frame[2]));
		} catch(e) {
			error.call(this, e);
		}

		if (frame) {
			this.frameReceived(frame[0], frame[1], frame[2]);
		}
	}

	this.connectionLost = function() {
		logger.debug('conn lost');
	}
});



