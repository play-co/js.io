jsio('import Class, log, bind, jsio.interfaces, jsio.logging');
jsio('from .csp.server import createServer');

var logger = jsio.logging.getLogger('node.csp');

var Transport = Class(jsio.interfaces.Transport, function() {
    this.init = function(socket) {
        this._socket = socket;
        logger.debug('init', socket);
    }

    this.makeConnection = function(protocol) {
        logger.debug('makeConnection:', protocol);
        this._socket.addListener("receive", bind(protocol, 'dataReceived'));

        this._socket.addListener("eof", this._socket.close);
        this._socket.addListener("close", bind(protocol, 'connectionLost')); // TODO: map error codes
    }

    this.write = function(data) {
        this._socket.send(data);
    }

    this.loseConnection = function() {
        this._socket.forceClose();
    }
});

exports.Listener = Class(jsio.interfaces.Listener, function(supr) {
    this.listen = function() {
        var s = createServer(bind(this, function(socket) {
            logger.info("Incoming connection");
            socket.setEncoding("utf8");
            socket.addListener("connect", bind(this, function() {
                logger.debug('connect event');
                logger.debug('connect event');
                this.onConnect(new Transport(socket));
            }));
        }));
        var listenString = (this._opts.interface || "" ) + ":" + this._opts.port;
        // TODO: Show class name
        logger.info("Listening csp@" + listenString);
        s.listen(this._opts.port, this._opts.interface || "");
    }
});

