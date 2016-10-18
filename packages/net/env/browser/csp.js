let exports = {};

import {
  bind,
  logger
} from 'base';

import interfaces from '../../interfaces';
import client from '../../csp/client';
let CometSession = client.CometSession;
import utf8 from '../../../std/utf8';

/**
 * @extends net.interfaces.Connector
 */
exports.Connector = class extends interfaces.Connector {
  connect () {
    this._state = interfaces.STATE.CONNECTING;

    var conn = new CometSession();
    conn.onconnect = bind(this, 'cometSessionOnConnect', conn);
    conn.ondisconnect = bind(this, 'onDisconnect');

    logger.debug('opening the connection');
    if (!this._opts.encoding) {
      this._opts.encoding = 'utf8';
    }
    conn.connect(this._opts.url, this._opts);
  }
  cometSessionOnConnect (conn) {
    logger.debug('conn has opened');
    this.onConnect(new Transport(conn));
  }
};

class Transport extends interfaces.Transport {
  constructor (conn) {
    super();

    this._conn = conn;
  }
  makeConnection (protocol) {
    this._conn.onread = bind(protocol, 'dataReceived');
  }
  write (data) {
    this._conn.write(data);
  }
  loseConnection (protocol) {
    this._conn.close();
  }
}

export default exports;
