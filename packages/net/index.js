let exports = {};

import { logger } from 'base';

import env from './env';
import JSON from '../std/JSON';
import interfaces from './interfaces';

JSON.createGlobal();


// create the global JSON object if it doesn't already exist
/**
 * @namespace
 */
exports.listen = function (server, transportName, opts) {
  if (!transportName) {
    throw logger.error('No transport provided for net.listen');
  }




  var ctor = typeof transportName == 'string' ? env.getListener(transportName) : transportName;

  var listener = new ctor(server, opts);

  listener.listen();
  return listener;
};

exports.connect = function (protocolInstance, transportName, opts) {
  var ctor = typeof transportName == 'string' ? env.getConnector(transportName) : transportName, connector = new ctor(protocolInstance, opts);
  connector.connect();
  return connector;
};

exports.quickServer = function (protocolClass) {
  return new interfaces.Server(protocolClass);
};

export default exports;
