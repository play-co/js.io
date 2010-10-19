"use import";
import std.js as JS;

exports = Class(function() {
	this.init = function(src) {
		this._src = src;
		this._i = 0;
		
		// a call count prevents a stack overflow if the callback in
		// an aysncloop is called repeatedly for large arrays
		this._calls = 0;
		if (JS.isArray(src)) {
			this._isArray = true;
		} else {
			this._keys = Object.keys(src);
		}
	}
	
	this.next = function() {
		if (this._isArray) {
			return this._src[this._i++] || exports.END_OF_LOOP;
		} else {
			var key = this._keys[this._i++];
			return key ? this._src[key] : exports.END_OF_LOOP;
		}
	}
	
	this.loop = function(cb) {
		var next;
		while((next = this.next())) {
			cb(next);
		}
	}
	
	this.asyncLoop = function(cb) {
		this._next = bind(this, '_onReturn', cb);
		this._calls++;
		this._asyncLoop(cb);
	}
	
	this._asyncLoop = function(cb) {
		this._inLoop = true;
		while (this._calls) {
			--this._calls;
			cb(this.next(), this._next);
		}
		this._inLoop = false;
	}
	
	this._onReturn = function(cb) {
		this._calls++;
		if (!this._inLoop) { this._asyncLoop(cb); }
	}
});

exports.END_OF_LOOP = new Error('jsio.Iterator.END_OF_LOOP');
