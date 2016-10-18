let exports = {};

import {
  bind,
  logger
} from 'base';

import interfaces from 'net/interfaces';
import browser from 'util/browser';
let $ = browser.$;
import uuid from 'std/uuid';

var ID = 0;
var uniqueId = 1;

/**
 * @extends net.interfaces.Listener
 */
exports.Listener = class extends interfaces.Listener {
  constructor () {
    super(...arguments);
    this._clients = {};
    if (!this._opts.clientUrl) {
      this._opts.clientUrl = jsio.__dir + '/networkConsole.html';
    }

    this._port = '' + (this._opts.port || '');
  }
  listen () {
    $.onEvent(window, 'message', bind(this, '_onMessage'));
  }
  getButton (url, text) {
    var button = $({
      tagName: 'button',
      text: text || 'launch client',
      className: 'clientButton'
    });
    $.onEvent(button, 'click', bind(this, 'openWindow', url || this._opts.clientUrl));
    return button;
  }
  openWindow (url) {
    var options = {
      menubar: 'no',
      location: 'no',
      toolbar: 'no',
      width: 550,
      height: 350,
      // left: 200, top: 200,
      scrollbars: 'yes',
      status: 'yes',
      resizable: 'yes'
    };

    var arr = [];
    for (var i in options) {
      arr.push(i + '=' + options[i]);
    }
    var win = window.open(url, 'W' + uniqueId++, arr.join(','));
    win.focus();
  }
  _onMessage (evt) {
    if (typeof evt.data != 'string' || this._port != evt.data.substring(0,
        this._port.length)) {
      return;
    }
    var data = evt.data.substring(this._port.length);

    try {
      data = JSON.parse(data);
    } catch (e) {
      logger.warn('invalid packet', evt.data);
      return;
    }

    switch (data.type) {
      case 'open':
        var transport = this._clients[data.uid] = new exports.Transport(evt.source,
        this._port, data.uid);
        evt.source.postMessage(this._port + JSON.stringify({
          'type': 'open',
          uid: data.uid
        }), '*');
        this.onConnect(transport);
        break;
      case 'data':
        var transport = this._clients[data.uid];
        if (transport) {
          transport.onData(data.payload);
        }
        break;
      case 'close':
        var transport = this._clients[data.uid];
        if (transport) {
          transport.onClose();
        }
        evt.source.postMessage(this._port + JSON.stringify({
          'type': 'close',
          uid: data.uid
        }), '*');
        delete this._clients[data.uid];
        break;
    }
  }
};

/**
 * @extends net.interfaces.Connector
 */
exports.Connector = class extends interfaces.Connector {
  connect () {
    this._port = '' + (this._opts.port || '');
    this._win = this._opts.win || window.opener || window.parent;
    $.onEvent(window, 'message', bind(this, '_onMessage'));

    this._uid = uuid.uuid();
    this._win.postMessage(this._port + JSON.stringify({
      type: 'open',
      uid: this._uid
    }), '*');
  }
  _onMessage (evt) {
    if (typeof evt.data != 'string' || this._port != evt.data.substring(0,
        this._port.length)) {
      return;
    }
    var data = evt.data.substring(this._port.length);

    // At the moment, we include the uid in the data.  If we have many clients
    // on the same port with different UIDs then this would get expensive, but
    // this is a very rare use case for postmessage.
    try {
      data = JSON.parse(data);
    } catch (e) {
      logger.warn('invalid packet', evt.data);
      return;
    }

    switch (data.type) {
      case 'open':
        this._transport = new exports.Transport(evt.source, this._port, this._uid);
        this.onConnect(this._transport);
        break;
      case 'close':
        if (data.uid != this._uid) {
          return;
        }
        this._transport.onClose();
        break;
      case 'data':
        if (data.uid != this._uid) {
          return;
        }
        this._transport.onData(data.payload);
        break;
    }
  }
};

/**
 * @extends net.interfaces.Transport
 */
exports.Transport = class extends interfaces.Transport {
  constructor (win, port, uid) {
    super();

    if (!uid)
      { debugger; }
    this._win = win;
    this._port = port;
    this._uid = uid;
  }
  makeConnection (protocol) {
    this._protocol = protocol;
  }
  write (data, encoding) {
    if (this.encoding == 'utf8') {
      this._win.postMessage(this._port + JSON.stringify({
        type: 'data',
        uid: this._uid,
        payload: utf8.encode(data)
      }), '*');
    } else {
      this._win.postMessage(this._port + JSON.stringify({
        type: 'data',
        uid: this._uid,
        payload: data
      }), '*');
    }
  }
  loseConnection (protocol) {
    this._win.postMessage(this._port + JSON.stringify({
      type: 'close',
      uid: this._uid,
      code: 301
    }), '*');
  }
  onData () {
    this._protocol.dataReceived.apply(this._protocol, arguments);
  }
  onClose () {
    this._protocol._connectionLost.apply(this._protocol, arguments);
  }
};

export default exports;
