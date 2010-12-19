"use import";

/**
 * Summary: Provides an object for iterating over the keys and values of
 * an object or array.  
 * Methods: 
 *  - init(src) - src is the object to iterate over
 *  - next(): returns the current value and advances the iterator to the next value
 *  - loop(cb): iterate over all items immediately, calling cb with each item
 *  - asyncLoop(cb): iterate over all items asynchronously.  First argument to
 *     the callback is the item.  Second argument is a function `nextItem` that, 
 *     when called, will cause the iterator to advance to the next element and 
 *     call cb again.
 * Usage notes: asyncLoop is implemented to not be vulnerable to stack overflows.
 *     If cb immediately calls the nextItem function, it will not immediately 
 *     result in a call to cb -- the stack will unwind to the asyncLoop call 
 *     before continuing.
 */

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
		} else if (Object.keys) {
			this._keys = Object.keys(src);
		} else {
			var k = this._keys = [];
			for (var i in src) { if (src.hasOwnProperty(i)) { k.push(i); } }
		}
	}
	
	this.nextKey = function() {
		return this._keys[this._i++];
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
		if (arguments.length > 1) { cb = bind.apply(this, arguments); }
		var next;
		if (this._isArray) {
			while((next = this.next())) {
				cb(next);
			}
		} else {
			while((next = this.nextKey())) {
				cb(this._src[next], next);
			}
		}
	}
	
	this.asyncLoop = function(cb) {
		if (arguments.length > 1) { cb = bind.apply(this, arguments); }
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
