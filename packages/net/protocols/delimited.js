let exports = {};

import { logger } from 'base';

import interfaces from '../interfaces';

/**
 * @extends net.interfaces.Protocol
 */
exports.DelimitedProtocol = class extends interfaces.Protocol {
  constructor (delimiter) {
    super();

    if (!delimiter) {
      delimiter = '\r\n';
    }
    this.delimiter = delimiter;
    this.buffer = '';
  }
  connectionMade () {
    logger.debug('connectionMade');
  }
  dataReceived (data) {
    if (!data) {
      return;
    }
    logger.debug('dataReceived:', data.length, data);
    this.buffer += data;
    var i;
    while ((i = this.buffer.indexOf(this.delimiter)) != -1) {
      var line = this.buffer.slice(0, i);
      this.buffer = this.buffer.slice(i + this.delimiter.length);
      this.lineReceived(line);
    }
  }
  lineReceived (line) {
    logger.debug('Not implemented, lineReceived:', line);
  }
  sendLine (line) {
    var data = line + this.delimiter;
    logger.debug('WRITE:', data);
    this.transport && this.transport.write(data);
  }
  connectionLost () {
    logger.debug('connectionLost');
  }
};

export default exports;
