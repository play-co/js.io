let exports = {};

import { logger } from 'base';

import interfaces from 'net/interfaces';
let Protocol = interfaces.Protocol;

exports.EmptyBufferError = class {
  constructor (message) {
    this.message = message;
  }
};
var EmptyBufferError = exports.EmptyBufferError;

exports.Buffer = class {
  constructor (rawBuffer) {
    this._rawBuffer = !!rawBuffer ? rawBuffer : '';
  }
  getLength () {
    return this._rawBuffer.length;
  }
  append (data) {
    logger.debug('append', JSON.stringify(data));
    this._rawBuffer += data;
  }
  peekBytes (num) {
    if (!!num)
      { return this._rawBuffer.slice(0, num); }
    else
      { return this._rawBuffer; }
  }
  peekToDelimiter (delimiter) {
    delimiter = delimiter ? delimiter : '\n';
    var i = this._rawBuffer.indexOf(delimiter);
    if (i == -1)
      { throw new EmptyBufferError('delimiter ' + delimiter +
        'not present in buffer'); }
    else
      { return this._rawBuffer.slice(0, i); }
  }
  consumeBytes (num) {
    var output = this.peekBytes(num);
    this._rawBuffer = this._rawBuffer.slice(output.length);
    return output;
  }
  consumeMaxBytes (num) {
    var output = this._rawBuffer.slice(0, num);
    this._rawBuffer = this._rawBuffer(num);
    return output;
  }
  consumeAllBytes () {
    var temp = this._rawBuffer;
    this._rawBuffer = '';
    return temp;
  }
  consumeThroughDelimiter (delimiter) {
    return this.consumeToDelimiter(delimiter) + this.consumeBytes(delimiter
      .length);
  }
  consumeToDelimiter (delimiter) {
    delimiter = !!delimiter ? delimiter : '\n';
    var output = this.peekToDelimiter(delimiter);
    this._rawBuffer = this._rawBuffer.slice(output.length);
    return output;
  }
  hasBytes (num) {
    num = num ? num : 0;
    return this._rawBuffer.length >= num;
  }
  hasDelimiter (delimiter) {
    delimiter = !!delimiter ? delimiter : '\n';
    return this._rawBuffer.indexOf(delimiter) != -1;
  }
};

export default exports;
