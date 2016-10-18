let exports = {};

import {
  bind,
  logger
} from 'base';

import interfaces from '../../interfaces';
var net = require('net');

class Transport extends interfaces.Transport {
  constructor (socket) {
    super();

    this._socket = socket;
  }
  makeConnection (protocol) {
    this._socket.addListener('data', bind(protocol, 'dataReceived'));
    this._socket.addListener('close', bind(protocol, 'connectionLost'));
  }
  write (data) {
    this._socket.write(data);
  }
  loseConnection () {
    this._socket.end();
  }
}

/**
 * @extends net.interfaces.Connector
 */
exports.Connector = class extends interfaces.Connector {
  connect () {
    var conn = net.createConnection(this._opts.port, this._opts.host);
    conn.addListener('connect', bind(this, function () {
      this.onConnect(new Transport(conn));
    }));
    //		conn.addListener("close", bind(this, function() {
    //			this.onDisconnect();
    //		}))
    //		conn.addListener("receive", bind(this._protocol, 'dataReceived'));
    this._opts.encoding = 'plain';
    conn.setEncoding('binary');
    if (typeof this._opts.timeout == 'number') {
      conn.setTimeout(this._opts.timeout);
    }
  }
};

/**
 * @extends net.interfaces.Listener
 */
exports.Listener = class extends interfaces.Listener {
  listen () {
    var s = net.createServer(bind(this, function (socket) {
      if (typeof this._opts.timeout == 'number') {
        socket.setTimeout(this._opts.timeout);
      }

      socket.setEncoding('utf8');
      this.onConnect(new Transport(socket));
    }));

    var listenString = (this._opts['interface'] || '') + ':' + this._opts.port;
    // TODO: Show class name
    logger.info('Listening tcp@' + listenString);
    s.listen(this._opts.port, this._opts['interface'] || '').on('error',
      bind(this, function (err) {
        logger.error(err);
        this.emit('error', err);
      }));
  }
};

export default exports;
