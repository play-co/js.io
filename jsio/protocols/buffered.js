jsio('import Class, bind, jsio.logging');
jsio('from jsio.interfaces import Protocol');
jsio('from jsio.buffer import Buffer');

var logger = jsio.logging.getLogger('Buffered');


exports.BufferedProtocol = Class(Protocol, function(supr) {

    this.init = function() {
        this.buffer = new Buffer();
    }

    // Overwrite this instead of dataReceived in base classes
    this.bufferUpdated = function() {
        
    }

    this.dataReceived = function(data) {
        this.buffer.append(data);
        this.bufferUpdated();
    }

})