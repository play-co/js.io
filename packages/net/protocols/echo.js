let exports = {};

import { logger } from 'base';

import interfaces from 'net/interfaces';

/**
 * @extends net.interfaces.Protocol
 */
exports.Protocol = class extends interfaces.Protocol {
  connectionMade () {
    logger.debug('in connectionMade');
    this.transport.write('Welcome');
  }
  dataReceived (data) {
    logger.debug('dataReceived:', data);
    this.transport.write('Echo: ' + data);
  }
  connectionLost () {
    logger.debug('conn lost');
  }
};

exports.Server = class extends interfaces.Server {
  constructor () {
    super(exports.Protocol);
  }
};

export default exports;
