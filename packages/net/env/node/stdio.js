let exports = {};

import { bind } from 'base';

import interfaces from '../../interfaces';

class Transport extends interfaces.Transport {
  constructor (inStream, outStream) {
    super();

    this._inStream = inStream;
    this._outStream = outStream;
    this.setEncoding('plain');
  }
  setEncoding (encoding) {
    super.setEncoding(...arguments);
    if (encoding == 'plain') {
      encoding = 'binary';
    }
    this._inStream.setEncoding(encoding);
    this._outStream.setEncoding(encoding);
  }
  makeConnection (protocol) {
    this._inStream.on('data', bind(protocol, 'dataReceived'));
    this._inStream.on('end', bind(protocol, 'connectionLost'));
  }
  write (data) {
    this._outStream.write(data);
    this._outStream.flush();
  }
  loseConnection () {}
}

/**
 * @extends net.interfaces.Connector
 */
exports.Connector = class extends interfaces.Connector {
  connect () {
    var stdin = process.openStdin();
    var stdout = process.stdout;
    var transport = new Transport(stdin, stdout);
    this.onConnect(transport);
  }
};

export default exports;
