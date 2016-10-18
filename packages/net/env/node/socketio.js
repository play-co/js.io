let exports = {};

import {
  logger,
  bind
} from 'base';

import interfaces from '../../interfaces';

class Transport extends interfaces.Transport {
  constructor (socket) {
    super();

    this._socket = socket;
    logger.debug('init', socket);
  }
  makeConnection (protocol) {
    logger.debug('makeConnection:', protocol);
    this._socket.on('message', bind(protocol, 'dataReceived'));
    this._socket.on('disconnect', bind(protocol, '_connectionLost'));
  }
  write (data) {
    this._socket.send(data);
  }
  loseConnection () {
    this._socket.close();
  }
}

/**
 * @extends net.interfaces.Listener
 */
exports.Listener = class extends interfaces.Listener {
  listen () {
    if (this._opts.port) {
      // if a port is provided, create an http server and host socket.io
      // at the specified port
      var server = require('http').Server();
      server.listen(this._opts.port);
      this._ioServer = this._opts.io(server);
    } else if (this._opts.io) {
      // if an io server is already setup
      if (this._opts.namespace) {
        // use the url as a namespace
        this._ioServer = this._opts.io.of(this._opts.namespace);
      } else {
        this._ioServer = this._opts.io;
      }
    }

    if (this._ioServer) {
      this._ioServer.on('connection', bind(this, '_onConnect'));
    } else {
      logger.warn(
        'socket.io not setup properly: please provide an io instance or an http port to the net.listen opts'
      );
    }
  }
  _onConnect (socket) {
    logger.info('Incoming connection');
    this.onConnect(new Transport(socket));
  }
};

export default exports;
