let exports = {};

import interfaces from 'net/interfaces';
let Protocol = interfaces.Protocol;
import buffer from 'net/buffer';
let Buffer = buffer.Buffer;

/**
 * @extends net.interfaces.Protocol
 */
exports.BufferedProtocol = class extends Protocol {
  constructor () {
    super();

    this.buffer = new Buffer();
  }
  bufferUpdated () {}
  dataReceived (data) {
    this.buffer.append(data);
    this.bufferUpdated();
  }
};

export default exports;
