import ..interfaces;

/**
 * @extends net.interfaces.Protocol
 */
exports.DelimitedProtocol = Class(interfaces.Protocol, function(supr) {

	this.init = function(delimiter) {
		if (!delimiter) {
			delimiter = '\r\n'
		}
		this.delimiter = delimiter;
		this.buffer = ""
	}

	this.connectionMade = function() {
		logger.debug('connectionMade');
	}

	this.dataReceived = function(data) {
		if (!data) { return; }
		logger.debug('dataReceived:', data.length, data);
		this.buffer += data;
		var i;
		while ((i = this.buffer.indexOf(this.delimiter)) != -1) {
			var line = this.buffer.slice(0, i);
			this.buffer = this.buffer.slice(i + this.delimiter.length);
			this.lineReceived(line);
		}
	}

	this.lineReceived = function(line) {
		logger.debug('Not implemented, lineReceived:', line);
	}
	this.sendLine = function(line) {
		var data = line + this.delimiter;
		logger.debug('WRITE:', data);
		this.transport && this.transport.write(data);
	}
	this.connectionLost = function() {
		logger.debug('connectionLost');
	}
});

