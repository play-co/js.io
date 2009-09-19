require('jsio', ['Class', 'bind']);
require('jsio.logging');
require('jsio.interfaces', ['Protocol']);
require('jsio.buffer', ['Buffer']);
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