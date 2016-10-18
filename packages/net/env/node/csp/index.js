let exports = {};

import {
  logger,
  bind
} from 'base';

import interfaces from '../../../interfaces';
import server from './server';

class Transport extends interfaces.Transport {
  constructor (socket) {
    super();

    this._socket = socket;
    logger.debug('init', socket);
  }
  makeConnection (protocol) {
    logger.debug('makeConnection:', protocol);
    this._socket.addListener('receive', bind(protocol, 'dataReceived'));

    this._socket.addListener('close', bind(protocol, '_connectionLost'));
  }
  write (data) {
    this._socket.send(data);
  }
  loseConnection () {
    this._socket.forceClose();
  }
}

/**
 * @extends net.interfaces.Listener
 */
exports.Listener = class extends interfaces.Listener {
  listen () {
    var s = server.createServer(bind(this, '_onConnect'));
    this._cspServer = s;
    var listenString = (this._opts['interface'] || '') + ':' + this._opts.port;

    if (this._opts.app) {
      var app = this._opts.app;
      var middleware = this.createMiddleware();
      if (this._opts.url) {
        app.use(this._opts.url, middleware);
      } else {
        app.use(middleware);
      }
    } else if (!this._opts.skipListen) {
      logger.info('Listening csp@' + listenString);
      s.listen(this._opts.port, this._opts['interface'] || '');
    }
  }
  _onConnect (socket) {
    logger.info('Incoming connection');
    socket.setEncoding('utf8');
    socket.addListener('connect', bind(this, function () {
      this.onConnect(new Transport(socket));
    }));
  }
  createMiddleware () {
    return bind(this._cspServer, '_handleRequest');
  }
};

export default exports;
