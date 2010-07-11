/**
 * basic Hash/Set class
 *  var h = new Hash('a', 'b', 'c');
 *  h.contains('a') ==> true
 *
 *  var h = new Hash({a: '1', b: '2', c: '3'});
 *  h.contains('1') ==> true
 *  h.hasKey('a') ==> true
 */
exports = Class(function() {
	this.init = function() {
		this.m_keys = {};
		this.m_dict = {};
		this.m_values = {};
		if (arguments.length == 1 && typeof arguments == 'object') {
			var dict = arguments[0];
			for (var i in dict) {
				if (dict.hasOwnProperty(i)) {
					this.m_keys[i] = true;
					this.m_values[i] = dict[i];
				}
			}
		} else {
			for (var i = 0, len = arguments.length; i < len; i++) {
				this.m_keys[arguments[i]] = true;
				this.m_values[arguments[i]] = true;
			};
		}
	}
	
	this.contains = function(val) { return this.m_values.hasOwnProperty(val); }
	this.hasKey = this.containsKey = function(key) { return this.m_keys.hasOwnProperty(key); }
	this.each = function(f, ctx) {
		for (var i in keys) {
			if (this.m_keys.hasOwnProperty(i)) {
				f.call(ctx || GLOBAL, i, this.m_values[i], this);
			}
		}
	}
});
