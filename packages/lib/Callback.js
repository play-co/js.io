"use import";

import std.js as JS;

exports = Class(function() {
	this.init = function() {
		this._fired = false;
		this._run = [];
		this._id = 0;
		this._pending = 0;
		this._stat = {};
	}
	
	this.fired = function() { return this._fired; } 
	this.reset = function() { this._args = []; this._fired = false; }
	this.clear = function() { this.reset(); this._run = []; }
	this.forward = function(args) { this.run.apply(this, args); }
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
	}
	
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
	}
	
	this.fire = function() {
		if (this._fired) { return; }
		this._fired = true;
		
		var cbs = this._run;
		this._run = [];
		this._args = arguments;
		for(var i = 0, len = cbs.length; i < len; ++i) {
			if (cbs[i]) { cbs[i].apply(this, arguments); }
		}
	}
	
	this.chain = function(id) {
		++this._pending;
		this.reset();
		return bind(this, '_deferred', id || (this._id++));
	}

	this._deferred = function(id) {
		if (this._stat.hasOwnProperty(id)) { return; }

		this._stat[id] = JS.vargs(arguments, 1);
		if (this._pending) { --this._pending; }
		if (!this._pending) { this.fire(this._stat); }
	}
});
