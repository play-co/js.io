jsio('import Class, log, jsio.interfaces, jsio.logging');

var logger = jsio.logging.getLogger('EchoProtocol');
logger.setLevel(0);

exports.Protocol = Class(jsio.interfaces.Protocol, function() {
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

exports.Server = Class(jsio.interfaces.Server, function(supr) {
    this.init = function() {
		supr(this, 'init', [exports.Protocol]);
    }
});

