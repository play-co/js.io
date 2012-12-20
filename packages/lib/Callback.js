exports = Class(function() {

	this._fired = false;
	this._id = 0;
	this._pending = null;

	this.init = function() { this._run = []; };
	
	/* fired is @deprecated in favor of hasFired*/
	this.hasFired = this.fired = function() { return this._fired; } ;

	// preserve pending callbacks, but clear fired status
	this.reset = function() { this._args = []; this._fired = false; };

	// clear fired status and remove any pending callbacks
	this.clear = function() { this.reset(); this._run = []; this._pending = null; this._stat = null; };

	// a convenience function to proxy arguments to `this.run`: arguments passed as the first argument
	this.forward = function(args) { this.run.apply(this, args); };

	// when the lib.Callback object fires, run a ctx, method, and
	// (optional) curried arguments or a single callback function
	this.run = function(ctx, method) {
		var f = method ? bind.apply(this, arguments) : ctx;
		if (f) {
			if (this._fired) {
				f.apply(this, this._args);
			} else {
				this._run.push(f);
			}
		}
		return this;
	};

	this.runOrTimeout = function(onFire, onTimeout, duration) {
		if (!onFire && !onTimeout) { return; }

		if (this._fired) {
			onFire.apply(this, this._args);
		} else {
			var f = bind(this, function() {
				clearTimeout(timeout);
				onFire.apply(this, this._args);
			});

			this.run(f);

			var timeout = setTimeout(bind(this, function() {
				for (var i = 0, n = this._run.length; i < n; ++i) {
					if (this._run[i] == f) {
						this._run.splice(i, 1);
						break;
					}
				}

				onTimeout();
			}), duration);
		}
	};

	this.fire = function() {
		if (this._fired) { return; }
		this._fired = true;

		var cbs = this._run;
		this._args = arguments;
		for(var i = 0, len = cbs.length; i < len; ++i) {
			if (cbs[i]) { cbs[i].apply(this, arguments); }
		}
	};

	this.chain = function(id) {
		if (!this._pending) { this._pending = {}; }
		if (id === undefined) { id = this._id++; }
		this._pending[id] = true;

		this.reset();
		return bind(this, '_deferred', id);
	};

	this._deferred = function(id) {
		if (!this._stat) { this._stat = {}; }
		if (this._stat.hasOwnProperty(id)) { return; }

		this._stat[id] = Array.prototype.slice.call(arguments, 1);
		var pending = this._pending;
		delete pending[id];
		for (var id in pending) {
			if (pending.hasOwnProperty(id)) { return; }
		}

		this.fire(this._stat);
	};
});
