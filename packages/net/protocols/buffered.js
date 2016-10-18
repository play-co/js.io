let exports = {};

import interfaces from 'net/interfaces';
let Protocol = interfaces.Protocol;
import buffer from 'net/buffer';
let Buffer = buffer.Buffer;

/**
 * @extends net.interfaces.Protocol
 */
exports.BufferedProtocol = Class(Protocol, function (supr) {
  this.init = function () {
    this.buffer = new Buffer();
  };

  // Overwrite this instead of dataReceived in base classes
  this.bufferUpdated = function () {
  };

  this.dataReceived = function (data) {
    this.buffer.append(data);
    this.bufferUpdated();
  };

});

export default exports;
