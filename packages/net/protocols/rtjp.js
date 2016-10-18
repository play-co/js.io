let exports = {};

import { logger } from 'base';

import delimited from './delimited';
let DelimitedProtocol = delimited.DelimitedProtocol;

var error = function (e) {
  logger.error(e);
};

/**
 * @extends net.protocols.delimited.DelimitedProtocol
 */
exports.RTJPProtocol = class extends DelimitedProtocol {
  constructor () {
    var delimiter = '\r\n';
    super(delimiter);
    this.frameId = 0;
  }
  connectionMade () {
    if (this._client && this._client.connectionMade) {
      this._client.connectionMade();
    }
    logger.debug('connectionMade');
  }
  frameReceived (id, name, args) {}
  sendFrame (name, args) {
    if (!args) {
      args = {};
    }
    logger.debug('sendFrame', name, JSON.stringify(args));
    this.sendLine(JSON.stringify([
      ++this.frameId,
      name,
      args
    ]));
    return this.frameId;
  }
  lineReceived (line) {
    try {
      var frame = JSON.parse(line);
      if (frame.length != 3) {
        return error.call(this, 'Invalid frame length');
      }
      if (typeof frame[0] != 'number') {
        return error.call(this, 'Invalid frame id');
      }
      if (typeof frame[1] != 'string') {
        return error.call(this, 'Invalid frame name');
      }
      logger.debug('frameReceived:', frame[0], frame[1], JSON.stringify(
        frame[2]));
    } catch (e) {
      error.call(this, e);
    }

    if (frame) {
      this.frameReceived(frame[0], frame[1], frame[2]);
    }
  }
  connectionLost () {
    logger.debug('conn lost');
  }
};

export default exports;
