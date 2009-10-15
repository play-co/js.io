jsio('import Class, log, jsio.logging, jsio.interfaces');

var logger = jsio.logging.getLogger('DelimitedProtocol')
exports.DelimitedProtocol = Class(jsio.interfaces.Protocol, function(supr) {

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
        logger.debug('dataReceived:(' + data.length + ')', data);
        logger.debug('last 2:', data.slice(data.length-2));
        this.buffer += data;
        logger.debug('index', this.buffer.indexOf(this.delimiter));
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

    this.connectionLost = function() {
        logger.debug('connectionLost');
    }
});

