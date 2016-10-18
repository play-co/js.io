let exports = {};

import { logger } from 'base';

exports.Later = class {
  constructor () {
    this.cb = null;
    this.eb = null;
    this.values = [];
    this.errors = [];
    this.cancelback = null;
  }
  callback () {
    logger.debug('callback', [].slice.call(arguments, 0));
    if (this.cb) {
      var result = this.cb.apply(this, arguments);
      if (result == false) {
        this.cancel();
      }
    } else {
      this.values.push(arguments);
    }
  }
  errback () {
    logger.debug('eb', [].slice.call(arguments, 0));
    if (this.eb) {
      this.eb.apply(this, arguments);
    } else {
      this.errors.push(arguments);
    }
  }
  cancel () {
    if (this.cancelback) {
      var cb = this.cancelback;
      this.cancelback = null;
      cb.call(this);
    }
  }
  setCallback (cb) {
    this.cb = cb;
    for (var i = 0, v; v = this.values[i]; ++i) {
      this.cb.apply(this, v);
    }
    this.values = [];
    return this;
  }
  setErrback (eb) {
    this.eb = eb;
    for (var i = 0, v; e = this.errors[i]; ++i) {
      this.eb.apply(this, e);
    }
    this.errors = [];
    return this;
  }
  setCancelback (cancelback) {
    this.cancelback = cancelback;
    return this;
  }
};

exports.Later.prototype.succeed = exports.Later.prototype.callback;
exports.Later.prototype.fail = exports.Later.prototype.errback;
exports.Later.fail = function () {
  var l = new Later();
  return l.fail.apply(l, arguments);
};
exports.Later.succeed = function () {
  var l = new Later();
  return l.succeed.apply(l, arguments);
};

export default exports;
