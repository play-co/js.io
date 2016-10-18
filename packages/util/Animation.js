let exports = {};

import { bind } from 'base';

class SyncTimer {
  constructor () {
    this._items = [];
    this._tick = bind(this, 'tick');
    this._length = 0;
  }
  tick () {
    var now = +new Date();
    var dt = now - this._last;
    this._last = now;

    // items might get removed as we iterate, so this._length can change
    for (var i = 0; i < this._length; ++i) {
      this._items[i](dt);
    }
  }
  add (cb) {
    if (cb) {
      this._items.push(cb);
      ++this._length;
      cb(0);
      this.start();
    }
  }
  remove (cb) {
    for (var i = 0, n = this._items.length; i < n; ++i) {
      if (this._items[i] == cb) {
        this._items.splice(i, 1);
        if (!--this._length) {
          this.stop();
        }
        return;
      }
    }
  }
  start () {
    if (!this._isRunning) {
      this._isRunning = true;
      this._last = +new Date();
      this._timer = setInterval(this._tick, 15);
    }
  }
  stop () {
    if (this._isRunning) {
      this._isRunning = false;
      clearInterval(this._timer);
    }
  }
}

var timer = new SyncTimer();

exports = class {
  constructor (params) {
    this._start = 'start' in params ? params.start : 0;
    this._end = 'end' in params ? params.end : 1;
    this._transition = params.transition || null;
    this._easing = params.easing || false;
    this._subject = params.subject;
    this._duration = params.duration || 1000;
    this._s = params.current || this._start;
    this._onFinish = params.onFinish || null;

    this._range = this._end - this._start;
    this._isAnimating = false;
    this._animate = bind(this, 'animate');
    this._timer = null;
  }
  stop () {
    this.jumpTo(this._s);
  }
  play () {
    this.seekTo(this._end);
  }
  seekTo (s, dur) {
    if (s == this._s) {
      return;
    }

    this._t0 = 0;
    this._s0 = this._s;
    this._s1 = s;
    if (dur)
      { this._duration = dur; }

    this._ds = s - this._s;
    var dt = this._ds / this._range * this._duration;
    this._dt = dt < 0 ? -dt : dt;

    if (!this._isAnimating) {
      this._isAnimating = true;
      timer.add(this._animate);
    }

    return this;
  }
  onFinish (onFinish) {
    this._onFinish = onFinish;
    return this;
  }
  jumpTo (s) {
    this._s1 = this._s0 = s;
    this._t0 = 0;
    this._dt = 1;
    this._ds = 0;
    this.animate(0);
    return this;
  }
  animate (dt) {
    var elapsed = this._t0 += dt;
    var dt = elapsed / this._dt;
    if (dt > 1) {
      dt = 1;
    }
    this._s = this._s0 + dt * this._ds;

    var x = this._transition ? this._transition(this._s) : this._s;
    try {
      this._subject(x, this._s);
    } finally {
      if (dt == 1) {
        timer.remove(this._animate);
        this._isAnimating = false;
        if (this._onFinish) {
          this._onFinish();
        }
      }
    }
  }
};

exports.linear = function (n) {
  return n;
};
exports.easeIn = function (n) {
  return n * n;
};
exports.easeInOut = function (n) {
  return (n *= 2) < 1 ? 0.5 * n * n * n : 0.5 * ((n -= 2) * n * n + 2);
};
exports.easeOut = function (n) {
  return n * (2 - n);
};

export default exports;
