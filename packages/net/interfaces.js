let exports = {};

// Sort of like a twisted protocol
import { logger } from 'base';

import net from './index';
import Enum from '../lib/Enum';
import PubSub from '../lib/PubSub';

var ctx = jsio.__env.global;

exports.Protocol = class {
  connectionMade (isReconnect) {}
  dataReceived (data) {}
  connectionLost (reason) {}
  _connectionMade () {
    this._isConnected = true;
    this.connectionMade.apply(this, arguments);
  }
  _connectionLost () {
    this._isConnected = false;
    this.connectionLost.apply(this, arguments);
  }
  isConnected () {
    return !!this._isConnected;
  }
  end () {
    if (this.transport) {
      this.transport.loseConnection();
    }
  }
};

exports.Protocol.prototype._isConnected = false;
exports.Client = class {
  constructor (protocol) {
    this._protocol = protocol;
  }
  connect (transportName, opts) {
    this._remote = new this._protocol();
    this._remote._client = this;
    net.connect(this._remote, transportName, opts);
  }
};

// Sort of like a twisted factory
exports.Server = class {
  constructor (protocolClass) {
    this._protocolClass = protocolClass;
  }
  buildProtocol () {
    return new this._protocolClass();
  }
  listen (transportName, opts) {
    return net.listen(this, transportName, opts);
  }
};

exports.Transport = class {
  write (data, encoding) {
    throw new Error('Not implemented');
  }
  getPeer () {
    throw new Error('Not implemented');
  }
  setEncoding (encoding) {
    this._encoding = encoding;
  }
  getEncoding () {
    return this._encoding;
  }
};

exports.Transport.prototype._encoding = 'plain';
// emits 'error' event if listen fails
exports.Listener = class extends PubSub {
  constructor (server, opts) {
    super();

    this._server = server;
    this._opts = opts || {};
  }
  onConnect (transport) {
    // try {
    var p = this._server.buildProtocol();
    p.transport = transport;
    p.server = this._server;
    transport.protocol = p;
    transport.makeConnection(p);
    p._connectionMade();
  }
  listen () {
    throw new Error('Abstract class');
  }
  stop () {}
};

exports.STATE = Enum('INITIAL', 'DISCONNECTED', 'CONNECTING', 'CONNECTED');
exports.Connector = class {
  constructor (protocol, opts) {
    this._protocol = protocol;
    this._opts = opts;
    this._state = exports.STATE.INITIAL;
  }
  getState () {
    return this._state;
  }
  onConnect (transport) {
    this._state = exports.STATE.CONNECTED;

    transport.makeConnection(this._protocol);
    this._protocol.transport = transport;
    try {
      this._protocol._connectionMade();
    } catch (e) {
      throw logger.error(e);
    }
  }
  onDisconnect (err) {
    var wasConnected = this._state == exports.STATE.CONNECTED;
    this._state = exports.STATE.DISCONNECTED;

    try {
      this._protocol._connectionLost(err, wasConnected);
    } catch (e) {
      throw logger.error(e);
    }
  }
  getProtocol () {
    return this._protocol;
  }
};

export default exports;
