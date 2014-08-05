import ....interfaces;
import .server;

var Transport = Class(interfaces.Transport, function() {
  this.init = function(socket) {
    this._socket = socket;
    logger.debug('init', socket);
  }

  this.makeConnection = function(protocol) {
    logger.debug('makeConnection:', protocol);
    this._socket.addListener("receive", bind(protocol, 'dataReceived'));

    this._socket.addListener("close", bind(protocol, '_connectionLost')); // TODO: map error codes
  }

  this.write = function(data) {
    this._socket.send(data);
  }

  this.loseConnection = function() {
    this._socket.forceClose();
  }
});

/**
 * @extends net.interfaces.Listener
 */
exports.Listener = Class(interfaces.Listener, function(supr) {
  this.listen = function () {
    var s = server.createServer(bind(this, '_onConnect'));
    this._cspServer = s;
    var listenString = (this._opts['interface'] || "" ) + ":" + this._opts.port;

    if (this._opts.app) {
      var app = this._opts.app;
      var middleware = this.createMiddleware();
      if (this._opts.url) {
        app.use(this._opts.url, middleware);
      } else {
        app.use(middleware);
      }
    } else if (!this._opts.skipListen) {
      logger.info("Listening csp@" + listenString);
      s.listen(this._opts.port, this._opts['interface'] || "");
    }
  }

  this._onConnect = function (socket) {
    logger.info("Incoming connection");
    socket.setEncoding("utf8");
    socket.addListener("connect", bind(this, function() {
      this.onConnect(new Transport(socket));
    }));
  }

  // for express middleware
  this.createMiddleware = function () {
    return bind(this._cspServer, '_handleRequest');
  }
});
