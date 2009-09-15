require('jsio', ['Class', 'bind']);
require('jsio.interfaces');
require('jsio.logging')
require('jsio.protocols.delimited', ['DelimitedProtocol'])

var logger = jsio.logging.getLogger('RTJPProtocol')
exports.RTJPProtocol = Class(DelimitedProtocol, function(supr) {
    this.init = function() {
        supr(this, 'init', ['\n']);
        this.frameId = 0;
    }

    this.connectionMade = function() {
        logger.debug("connectionMade");
    }
    
    var error = function(e) {
        // TODO: send back an error?
    }
    
    // Inherit and overwrite
    this.frameReceived = function(id, name, args) {
        logger.debug("frameReceived:", id, name, args);
    }

    // Public
    this.sendFrame = function(name, args) {
        if (!args) {
            args = {}
        }
        logger.debug('sendFrame', name, args);
        this.transport.write(JSON.stringify([++this.frameId, name, args]) + '\r\n');
    }

    this.lineReceived = function(line) {
        try {
            var frame = JSON.parse(line);
            if (frame.length != 3) {
                return error.call(this, "Invalid frame length");
            }
            if (typeof(frame[0]) != "number") {
                return error.call(this, "Invalid frame id");
            }
            if (typeof(frame[1]) != "string") {
                return error.call(this, "Invalid frame name");
            }
            if (typeof(frame[2]) != "object") {
                return error.call(this, "Invalid frame args");
            }
            this.frameReceived(frame[0], frame[1], frame[2]);
/*            var f = this['frame_' + frame[1]];
            if (!f) { 
                this.defaultFrameReceived(frame[0], frame[1], frame[2]); 
            }
            else {
                f.call(this, frame[0], frame[2]);
            }
*/
        } catch(e) {
            error.call(e);
        }
    }

    this.connectionLost = function() {
        log('conn lost');
    }
});



