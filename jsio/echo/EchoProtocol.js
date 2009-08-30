jsio.declare('jsio.echo.EchoProtocol', jsio.Protocol, function() {
    this.connectionMade = function() {
        jsio.log('in connectionMade');
        this.transport.write('Welcome')
    }
    this.dataReceived = function(data) {
        jsio.log('dataReceived:', data);
        this.transport.write('Echo: ' + data);
    }
    this.connectionLost = function() {
        jsio.log('conn lost');
    }
})
