jsio('import Class, bind, jsio.interfaces, jsio.logging');
jsio('from jsio.protocols.delimited import DelimitedProtocol');

var logger = jsio.logging.getLogger('RTJPProtocol')
exports.RTJPProtocol = Class(DelimitedProtocol, function(supr) {
	this.init = function() {
		var delimiter = '\n';
		supr(this, 'init', [delimiter]);
		this.frameId = 0;
	}

	this.connectionMade = function() {
		logger.debug("connectionMade");
	}
	
	var error = function(e) {
		logger.warn('Error: ', e, e.traceback);
	}
	
	// Inherit and overwrite
	this.frameReceived = function(id, name, args) {
	}

	// Public
	this.sendFrame = function(name, args) {
		if (!args) {
			args = {}
		}
		logger.debug('sendFrame', name, args);
		this.transport.write(JSON.stringify([++this.frameId, name, args]) + '\r\n');
		return this.frameId;
	}

	this.lineReceived = function(line) {
		logger.debug("lineReceived", line);
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
			if (typeof(frame[2]) != "object") {
				return error.call(this, "Invalid frame args");
			}
			logger.debug("frameReceived:", frame[0], frame[1], frame[2]);
			this.frameReceived(frame[0], frame[1], frame[2]);
		} catch(e) {
			error.call(this, e);
		}
	}

	this.connectionLost = function() {
		log('conn lost');
	}
});



