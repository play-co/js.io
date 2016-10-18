let exports = {};

/**
 * Summary: inherit from lib.PubSub if a class wants publish/subscribe ability
 * Methods:
 *  - publish(signal, args...) - all subscribers to signal will be called
 *     with the list of arguments provided.
 *  - subscribe(signal, ctx, method, args...) - register a bound method
 *     to a signal.  Any args that are passed in will be the first args
 *     when the method is invoked during a publish.
 *  Usage notes: There is one special signal '__any'.  Any subscribers to
 *     '__any' will be called on every publish with the first publish
 *     argument being the signal itself (after any args passed in during
 *     the corresponding subscribe).
 *     Calling the super constructor is not required for descendants of
 *     lib.PubSub.
 */
import {
  bind,
  GLOBAL,
  logger
} from 'base';

import _uuid from '../std/uuid';
let uuid = _uuid.uuid;

var ctx = jsio.__env.global,
  SLICE = Array.prototype.slice;

exports = class {
  constructor () {}
  publish (signal) {
    if (this._subscribers) {
      var args = SLICE.call(arguments, 1);
      if (this._subscribers.__any) {
        var anyArgs = [signal].concat(args),
          subs = this._subscribers.__any.slice(0);
        for (var i = 0, sub; sub = subs[i]; ++i) {
          sub.apply(ctx, anyArgs);
        }
      }

      if (!this._subscribers[signal]) {
        return this;
      }

      var subs = this._subscribers[signal].slice(0);
      for (var i = 0, sub; sub = subs[i]; ++i) {
        sub.apply(ctx, args);
      }
    }
    return this;
  }
  subscribe (signal, ctx, method) {
    var cb;
    if (arguments.length == 2) {
      cb = ctx;
    } else {
      cb = bind.apply(GLOBAL, SLICE.call(arguments, 1));
      cb._ctx = ctx;
      // references for unsubscription
      cb._method = method;
    }

    var s = this._subscribers || (this._subscribers = {});
    (s[signal] || (s[signal] = [])).push(cb);
    return this;
  }
  subscribeOnce (signal, ctx, method) {
    var args = arguments,
      cb = bind(this, function () {
        this.unsubscribe(signal, cb);
        if (args.length == 2) {
          ctx.apply(GLOBAL, arguments);
        } else {
          bind.apply(GLOBAL, SLICE.call(args, 1)).apply(GLOBAL, arguments);
        }
      });

    if (args.length >= 3) {
      cb._ctx = ctx;
      cb._method = method;
    }

    return this.subscribe(signal, cb);
  }
  unsubscribe (signal, ctx, method) {
    if (!this._subscribers || !this._subscribers[signal]) {
      return this;
    }
    var subs = this._subscribers[signal];
    for (var i = 0, c; c = subs[i]; ++i) {
      if (c == ctx || c._ctx == ctx && (!method || c._method == method)) {
        subs.splice(i--, 1);
      }
    }
    return this;
  }
  listeners (type) {
    this._subscribers = this._subscribers ? this._subscribers : {};
    return this.hasOwnProperty.call(this._subscribers, type) ? this._subscribers[
      type] : this._subscribers[type] = [];
  }
  on (type, f) {
    if (this.listeners(type).length + 1 > this._maxListeners && this._maxListeners !==
      0) {
      if (typeof console !== 'undefined') {
        console.warn('Possible EventEmitter memory leak detected. ' + this._subscribers[
            type].length +
          ' listeners added. Use emitter.setMaxListeners() to increase limit.'
        );
      }
    }
    this.emit('newListener', type, f);
    return this.subscribe(type, this, f);
  }
  once (type, f) {
    return this.subscribeOnce(type, this, f);
  }
  removeListener (type, f) {
    this.unsubscribe(type, this, f);
    return this;
  }
  removeAllListeners (type) {
    if (this._subscribers) {
      for (var k in this._subscribers) {
        if (type == null || type == k) {
          delete this._subscribers[k];
        }
      }
    }
    return this;
  }
  emit (type) {
    this.publish.apply(this, arguments);
    return this.listeners(type).length > 0;
  }
  setMaxListeners (_maxListeners) {
    this._maxListeners = _maxListeners;
  }
  hasListeners (type) {
    return this._subscribers && this._subscribers[type] && this._subscribers[
      type].length;
  }
  listenTo (obj, name, callback) {
    var listeningTo = this._listeningTo || (this._listeningTo = {});
    var id = obj._listenId || (obj._listenId = uuid(8, 16));
    listeningTo[id] = obj;
    obj.subscribe(name, this, callback);
    return this;
  }
  stopListening (obj, name, callback) {
    var events, names, retain, i, j, k, l, ev;
    var listeningTo = this._listeningTo;
    if (!listeningTo) {
      return this;
    }

    logger.log(obj);
    var remove = !name && !callback;
    if (obj) {
      (listeningTo = {})[obj._listenId] = obj;
    }

    for (var id in listeningTo) {
      obj = listeningTo[id];

      names = name ? [name] : Object.keys(obj._subscribers);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = obj._subscribers[name]) {
          obj._subscribers[name] = retain = [];
          for (j = 0, k = events.length; j < k; j++) {
            ev = events[j];
            if (callback && callback !== ev._method || this && this !== ev._ctx) {
              retain.push(ev);
            }
          }
          if (!retain.length)
            { delete obj._subscribers[name]; }
        }
      }
      if (remove) {
        delete this._listeningTo[id];
      }
    }
    return this;
  }
};

exports.prototype.addListener = exports.prototype.on;
exports.prototype._maxListeners = 10;
export default exports;
