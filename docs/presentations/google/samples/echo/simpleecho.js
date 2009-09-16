require('jsio', ['Class', 'bind']);
require('jsio.interfaces');
require('jsio.logging');

logger = jsio.logging.getLogger('EchoProtocol');

exports.EchoProtocol = Class(jsio.interfaces.Protocol, function(supr) {
    this.connectionMade = function() {
        logger.info('Connection Made');
        this.transport.write('Welcome \\ jsio/Echo 1.0\r\n');
    }
    this.dataReceived = function(data) {
        this.transport.write('Echo: ' + data);
    }
    this.connectionLost = function() {
        logger.info('Connection Lost');
    }
});

