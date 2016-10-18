let exports = {};

import {
  bind,
  GLOBAL,
  logger
} from 'base';

import Callback from 'jsio/lib/Callback';
import PubSub from 'jsio/lib/PubSub';

import rtjp from './rtjp';
let RTJPProtocol = rtjp.RTJPProtocol;

class Error {
  constructor (protocol, id, msg, details, requestId) {
    this.id = id;
    this.msg = msg;
    this.details = details;
    this.requestId = requestId;
  }
}

class RPCRequest {
  constructor (protocol, id) {
    this.protocol = protocol;
    this.id = id;
    this._onError = new lib.Callback();
    this._onSuccess = new lib.Callback();
  }
  onError () {
    this._onError.forward(arguments);
  }
  onSuccess () {
    this._onSuccess.forward(arguments);
  }
  bindLater (l) {
    var args = [].slice(arguments, 1);
    this._onError.forward([
      l,
      l.fail
    ].concat(args));
    this._onSuccess.forward([
      l,
      l.succed
    ].concat(args));
    return l;
  }

}

class ReceivedRequest {
  constructor (protocol, id, name, args, target) {
    this.protocol = protocol;
    this.id = id;
    this.name = name;
    this.responded = false;
    this.args = args;
    this.target = target;
  }
  error (msg, details) {
    if (this.responded) {
      throw new Error('already responded');
    }
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    args = {
      id: this.id,
      msg: msg + ''
    };
    if (details !== undefined) {
      args.details = details;
    }
    this.responded = true;
    this.protocol.sendFrame('ERROR', args);
  }
  respond (args) {
    if (this.responded) {
      throw new Error('already responded');
    }
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this.responded = true;
    this.protocol.sendFrame('RESPONSE', {
      id: this.id,
      args: args == undefined ? {} : args
    });
  }
  timeoutAfter (duration, msg) {
    if (this.responded) {
      return;
    }
    if (this._timer) {
      clearTimeout(this._timer);
    }
    this._timer = setTimeout(bind(this, '_timeout', msg), duration);
  }
  _timeout (msg) {
    if (!this.responded) {
      this.error(msg);
    }
  }
}

ReceivedRequest.prototype.type = 'request';
class ReceivedEvent {
  constructor (protocol, id, name, args, target) {
    this.id = id;
    this.name = name;
    this.args = args;
    this.target = target;
  }
}

/**
 * @extends net.protocols.rtjp.RTJPProtocol;
 */
exports = class extends RTJPProtocol {
  constructor () {
    super(...arguments);

    this._onConnect = new lib.Callback();
    this._onDisconnect = new lib.Callback();

    this._requests = {};

    this.onEvent = new lib.PubSub();
    this.onRequest = new lib.PubSub();
  }
  disconnect () {
    this.transport.loseConnection();
  }
  onConnect () {
    this._onConnect.forward(arguments);
  }
  onDisconnect () {
    this._onDisconnect.forward(arguments);
  }
  reset () {
    this._onConnect.reset();
    this._onDisconnect.reset();
  }
  connectionMade () {
    this._isConnected = true;
    this._onConnect.fire();
  }
  connectionLost (err) {
    for (var i in this._requests) {
      var req = this._requests[i];
      delete this._requests[i];
      req._onError.fire(err);
    }

    this._isConnected = false;
    this._onDisconnect.fire(err);
  }
  sendRequest (name, args, target, cb) {
    if (arguments.length > 4) {
      // allow bound functions (e.g. [this, 'onResponse', 123])
      cb = bind.apply(GLOBAL, Array.prototype.slice.call(arguments, 3));
    }

    var frameArgs = {
      name: name,
      args: args
    };

    if (target) {
      frameArgs.target = target;
    }

    var id = this.sendFrame('RPC', frameArgs),
      req = this._requests[id] = new RPCRequest(this, id);

    if (cb) {
      req.onSuccess(GLOBAL, cb, false);
      // will call cb(false, args...)
      req.onError(GLOBAL, cb);
    }

    // will call cb(err)
    return req;
  }
  sendEvent (name, args, target) {
    this.sendFrame('EVENT', {
      name: name,
      args: args,
      target: target || null
    });
  }
  frameReceived (id, name, args) {
    logger.debug('RECEIVED', id, name, args);
    switch (name.toUpperCase()) {
      case 'RESPONSE':
        var req = this._requests[args.id];
        if (!req) {
          return;
        }
        delete this._requests[args.id];
        req._onSuccess.fire(args.args);
        break;
      case 'ERROR':
        var msg = args.msg || 'unknown',
          requestId = args.id,
          req = this._requests[requestId],
          err = new Error(this, id, msg, args.details, requestId);

        if (!req) {
          return this.errorReceived && this.errorReceived(err);
        } else {
          delete this._requests[requestId];
          req._onError.fire(err);
        }
        break;
      case 'RPC':
      case 'EVENT':
        if (!args.name) {
          return self.sendFrame('ERROR', {
            'id': args.id || id,
            'msg': 'missing "name"'
          });
        }
        var frameArgs = args.args || {},
          target = args.target || null,
          isRPC = name.toUpperCase() == 'RPC',
          reqCtor = isRPC ? ReceivedRequest : ReceivedEvent,
          pubTarget = isRPC ? this.onRequest : this.onEvent,
          req = new reqCtor(this, args.id || id, args.name, frameArgs, target);

        pubTarget.publish(req.name, req);
        break;
      default:
        break;
    }
  }
};

export default exports;
