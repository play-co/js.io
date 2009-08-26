include('jsio.js')



onLoad = function() {
    EchoProtocol = jsio.Class(jsio.Protocol, function() {
        this.connectionMade = function() {
            node.debug('in connectionMade');
            this.transport.write('Welcome')
        }
        this.dataReceived = function(data) {
            node.debug('dataReceived: ' + data);
            this.transport.write('Echo: ' + data);
        }
        this.connectionLost = function() {
            
        }
        this.toString = function() {
            return "[EchoProtocol instance]"
        }
    })
    jsio.listenTCP(jsio.quickServer(EchoProtocol), 5555);

}