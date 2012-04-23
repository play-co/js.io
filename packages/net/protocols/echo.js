jsio('import net.interfaces');

/**
 * @extends net.interfaces.Protocol
 */
exports.Protocol = Class(net.interfaces.Protocol, function() {
	this.connectionMade = function() {
		logger.debug('in connectionMade');
		this.transport.write('Welcome')
	}
	
	this.dataReceived = function(data) {
		logger.debug('dataReceived:', data);
		this.transport.write('Echo: ' + data);
	}
	this.connectionLost = function() {
		logger.debug('conn lost');
	}
});

exports.Server = Class(net.interfaces.Server, function(supr) {
	this.init = function() {
		supr(this, 'init', [exports.Protocol]);
	}
});

