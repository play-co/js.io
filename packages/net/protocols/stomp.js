let exports = {};

import { logger } from 'base';

import buffered from 'net/protocols/buffered';
let BufferedProtocol = buffered.BufferedProtocol;
import _sprintf from 'util/sprintf';
let sprintf = _sprintf.sprintf;

/**
 * @extends net.protocols.buffered.BufferedProtocol
 */
exports.StompProtocol = class extends BufferedProtocol {
  constructor () {
    super();
    this.state = 'peek';
  }
  connect (username, password) {
    var frame = new StompFrame('CONNECT');
    if (!!username)
      { frame.setHeader('login', username); }
    if (!!password)
      { frame.setHeader('passcode', password); }
    this.sendFrame(frame);
  }
  send (destination, body, headers) {
    var frame = new StompFrame('SEND', body, headers);
    frame.setHeader('destination', destination);
    this.sendFrame(frame);
  }
  subscribe (destination, headers) {
    var frame = new StompFrame('SUBSCRIBE', null, headers);
    frame.setHeader('destination', destination);
    this.sendFrame(frame);
  }
  unsubscribe (destination, headers) {
    var frame = new StompFrame('UNSUBSCRIBE', null, headers);
    frame.setHeader('destination', destination);
    this.sendFrame(frame);
  }
  sendFrame (frame) {
    this.transport.write(frame.serialize());
  }
  frameReceived (frame) {
    logger.info('frame received', frame);
  }
  bufferUpdated () {
    logger.debug('bufferUpdated');
    var counter = 0;
    while (++counter < 10) {
      switch (this.state) {
        case 'peek':
          if (this.buffer.peekBytes(1) == '\n') {
            logger.debug('consuming a single \n byte');
            this.buffer.consumeBytes(1);
          }
          this.state = 'method';
        /* FALL THROUGH */
        case 'method':
          logger.debug('case method');
        // Fix for stomp servers that send extra \n byte
          if (!this.buffer.hasLine())
          { return; }
          this._frame = new StompFrame();
          var method = this.buffer.consumeThroughDelimiter();
          logger.debug('method is', JSON.stringify(method));
          this._frame.setMethod(method);
          this.state = 'headers';
        /* FALL THROUGH */
        case 'headers':
          logger.debug('case headers');
          var M = 0;
          while (this.buffer.hasLine() && ++M < 10) {
            var line = this.buffer.consumeThroughDelimiter();
            if (line.length == 0) {
              this.state = 'body';
              break;
            }
            var segments = line.split(':');
            var key = segments[0];
          // I guess we allow ": " in the header value.
            var value = segments.slice(1).join(':');
            while (value[0] == ' ')
            { value = value.slice(1); }
            while (value[1] == ' ')
            { value = value.slice(0, value.length - 1); }
            logger.debug('add header', key, value);
            this._frame.setHeader(key, value);
          }
          if (this.state == 'headers')
          { return; }
        /* FALL THROUGH */
        case 'body':
          if (this._frame.getBodyMode() == 'length') {
            if (!this.buffer.hasBytes(this._frame.getContentLength() + 1))
            { return; }
            this._frame.setBody(this.buffer.consumeBytes(this._frame.getContentLength()));
          // Remove trailing \x00
            this.buffer.consumeBytes(1);
          } else {
            if (!this.buffer.hasLine('\0'))
            { return; }
            this._frame.setBody(this.buffer.consumeThroughDelimiter('\0'));
          }
          this.frameReceived(this._frame);
          this._frame = null;
          this.state = 'peek';
      }
    }
  }
};

/* FALL THROUGH and LOOP */
exports.StompFrame = class {
  constructor (_method, _body, _headers) {
    this._headers = !!_headers ? _headers : {};
    this._method = !!_method ? _method : null;
    this._body = !!_body ? _body : '';
  }
  setHeader (key, val) {
    this._headers[key] = val;
  }
  getHeader (key) {
    return this._headers[key];
  }
  getHeaders () {
    return this._headers;
  }
  setMethod (m) {
    // TODO: enforce method constraints here?
    //	   -mcarter 9/18/09
    this._method = m;
  }
  getMethod () {
    return this._method;
  }
  setBody (b) {
    this._body = b;
  }
  getbody () {
    return this._body;
  }
  toString () {
    var i = 0;
    for (var key in this._headers) {
      ++i;
    }
    return sprintf(
      '[StompFrame method(%s), num-headers(%d), body-length(%d)]', this._method,
      i, this._body.length);
  }
  getContentLength () {
    return parseInt(this._headers['content-length']);
  }
  getBodyMode () {
    if ('content-length' in this._headers) {
      return 'length';
    }
    return 'delimited';
  }
  serialize () {
    var output = this._method + '\n';
    for (var key in this._headers) {
      output += key + ': ' + this._headers[key] + '\n';
    }
    output += 'content-length: ' + this._body.length + '\n';
    output += '\n';
    output += this._body;
    output += '\0';
    return output;
  }
};
var StompFrame = exports.StompFrame;

export default exports;
