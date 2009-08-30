jsio.require('jsio.echo.EchoProtocol')
jsio.declare('jsio.echo.EchoServer', jsio.Server, function() {
    this.init = function() {
        jsio.Server.init.call(this, jsio.echo.EchoProtocol);
    }
    this.connectionMade = function() {
        node.debug('in connectionMade');
        this.transport.write('Welcome')
    }
    this.dataReceived = function(data) {
        node.debug('dataReceived: ' + data);
        this.transport.write('Echo: ' + data);
    }
    this.connectionLost = function() {
        node.debug('conn lost');
    }
})
