let exports = {};

import { bind } from 'base';

exports = class {
  constructor () {
    this._run = [];
  }
  fired () {
    return this._fired;
  }
  reset () {
    this._args = [];
    this._fired = false;
  }
  clear () {
    this.reset();
    this._run = [];
    this._pending = null;
    this._stat = null;
  }
  forward (args) {
    this.run.apply(this, args);
  }
  run (ctx, method) {
    var f = method ? bind.apply(this, arguments) : ctx;
    if (f) {
      if (this._fired) {
        f.apply(this, this._args);
      } else {
        this._run.push(f);
      }
    }
    return this;
  }
  runOrTimeout (onFire, onTimeout, duration) {
    if (!onFire && !onTimeout) {
      return;
    }

    if (this._fired) {
      onFire.apply(this, this._args);
    } else {
      var f = bind(this, function () {
        clearTimeout(timeout);
        onFire.apply(this, this._args);
      });

      this.run(f);

      var timeout = setTimeout(bind(this, function () {
        for (var i = 0, n = this._run.length; i < n; ++i) {
          if (this._run[i] == f) {
            this._run.splice(i, 1);
            break;
          }
        }

        onTimeout();
      }), duration);
    }
  }
  fire () {
    if (this._fired) {
      return;
    }
    this._fired = true;

    var cbs = this._run;
    this._args = arguments;
    for (var i = 0, len = cbs.length; i < len; ++i) {
      if (cbs[i]) {
        cbs[i].apply(this, arguments);
      }
    }
  }
  chain (id) {
    if (!this._pending) {
      this._pending = {};
    }
    if (id === undefined) {
      id = this._id++;
    }
    this._pending[id] = true;

    this.reset();
    return bind(this, '_deferred', id);
  }
  _deferred (id) {
    if (!this._stat) {
      this._stat = {};
    }
    if (this._stat.hasOwnProperty(id)) {
      return;
    }

    this._stat[id] = Array.prototype.slice.call(arguments, 1);
    var pending = this._pending;
    delete pending[id];
    for (var id in pending) {
      if (pending.hasOwnProperty(id)) {
        return;
      }
    }

    this.fire(this._stat);
  }
};

exports.prototype._fired = false;
exports.prototype._id = 0;
exports.prototype._pending = null;
exports.prototype.hasFired = exports.prototype.fired;
export default exports;
