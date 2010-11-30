exports = Class(function() {
	this.init = function(params) {
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
	
	this.seekTo = function(s, dur) {
		this._t0 = +new Date();
		this._s0 = this._s;
		this._s1 = s;
		if(dur) this._duration = dur;
		
		this._ds = s - this._s;
		var dt = this._ds / this._range * this._duration;
		this._dt = dt < 0 ? -dt : dt;
		
		if(!this._isAnimating) {
			this._isAnimating = true;
			this._timer = setInterval(this._animate, 15);
		}
		
		return this;
	}
	
	this.onFinish = function(onFinish) { this._onFinish = onFinish; return this; }
	
	this.jumpTo = function(s) {
		this._s1 = this._s0 = s;
		this._t0 = 0;
		this._dt = 1;
		this._ds = 0;
		this.animate();
		return this; 
	}
	
	this.animate = function() {
		var dt = (new Date() - this._t0) / this._dt;
		if(dt > 1) { dt = 1; }
		this._s = this._s0 + dt * this._ds;
		
		var x = this._transition ? this._transition(this._s) : this._s;
		this._subject(this._start + this._range * x, this._s);
		
		if(dt == 1) {
			clearInterval(this._timer);
			this._isAnimating = false;
			if(this._onFinish) {
				this._onFinish();
			}
		}
	}
});

exports.linear = function (n) { return n; }
exports.easeIn = function (n) { return n * n; }
exports.easeInOut = function (n) { return (n *= 2) < 1 ? 0.5 * n * n * n : 0.5 * ((n -= 2) * n * n + 2); }
exports.easeOut = function(n) { return n * (2 - n); }