require('jsio', ['Class', 'log']);
require('jsio.interfaces');

exports.Protocol = Class(jsio.interfaces.Protocol, function() {
    this.connectionMade = function() {
        log('in connectionMade');
        this.transport.write('Welcome')
    }
    
    this.dataReceived = function(data) {
        log('dataReceived:', data);
        this.transport.write('Echo: ' + data);
    }
    this.connectionLost = function() {
        log('conn lost');
    }
});

exports.Server = Class(jsio.interfaces.Server, function(supr) {
    this.init = function() {
		supr(this, 'init', [exports.Protocol]);
    }
});

