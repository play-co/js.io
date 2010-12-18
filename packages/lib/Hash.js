/**
 * Summary: a basic Hash/Set class for number and string values.
 * Methods:
 *  - init(args...) - if args is a single JS object, this will be used to define
 *      the keys and values for the Hash.  
 *  - contains(value) 
 * Example:
 *  var h = new Hash('a', 'b', 'c');
 *  h.contains('a') ==> true
 *
 *  var h = new Hash({a: '1', b: '2', c: '3'});
 *  h.contains('1') ==> true
 *  h.hasKey('a') ==> true
 */
exports = Class(function() {
	this.init = function() {
		this._keys = {};
		this._dict = {};
		this._values = {};
		if (arguments.length == 1 && typeof arguments == 'object') {
			var dict = arguments[0];
			for (var i in dict) {
				if (dict.hasOwnProperty(i)) {
					this._keys[i] = true;
					this._values[i] = dict[i];
				}
			}
		} else {
			for (var i = 0, len = arguments.length; i < len; i++) {
				this._keys[arguments[i]] = true;
				this._values[arguments[i]] = true;
			};
		}
	}
	
	this.contains = function(val) { return this._values.hasOwnProperty(val); }
	this.hasKey = this.containsKey = function(key) { return this._keys.hasOwnProperty(key); }
	this.each = function(f, ctx) {
		for (var i in keys) {
			if (this._keys.hasOwnProperty(i)) {
				f.call(ctx || GLOBAL, i, this._values[i], this);
			}
		}
	}
});
