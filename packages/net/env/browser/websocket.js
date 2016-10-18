let exports = {};

import {
  logger,
  bind
} from 'base';

import interfaces from 'net/interfaces';
import utf8 from 'std/utf8';
import Errors from 'net/errors';

/**
 * @extends net.interfaces.Connector
 */
exports.Connector = class extends interfaces.Connector {
  connect () {
    this._state = interfaces.STATE.CONNECTING;

    var url = this._opts.url,
      ctor = this._opts.wsConstructor || window.WebSocket;

    logger.info('this._opts', this._opts);

    var ws = new ctor(url);
    ws.onopen = bind(this, 'webSocketOnOpen', ws);
    ws.onclose = bind(this, 'webSocketOnClose', ws);
  }
  webSocketOnOpen (ws) {
    this.onConnect(new Transport(ws));
  }
  webSocketOnClose (ws, e) {
    var err, data = {
        rawError: e,
        webSocket: ws
      };
    if (e.wasClean) {
      err = new Errors.ServerClosedConnection('WebSocket Connection Closed',
        data);
    } else {
      if (this._state == interfaces.STATE.CONNECTED) {
        err = new Errors.ConnectionTimeout('WebSocket Connection Timed Out',
          data);
      } else {
        err = new Errors.ServerUnreachable('WebSocket Connection Failed',
          data);
      }
    }

    logger.debug('conn closed', err);
    this.onDisconnect(err);
  }
};

class Transport extends interfaces.Transport {
  constructor (ws) {
    super();

    this._ws = ws;
  }
  makeConnection (protocol) {
    this._ws.onmessage = function (data) {
      var payload = utf8.encode(data.data);
      protocol.dataReceived(payload);
    };
  }
  write (data, encoding) {
    if (this._encoding == 'plain') {
      result = utf8.decode(data);
      data = result[0];
    }
    this._ws.send(data);
  }
  loseConnection (protocol) {
    this._ws.close();
  }
}

export default exports;
