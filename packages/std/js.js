var SLICE = Array.prototype.slice;

exports.vargs = function(args, n) { return SLICE.call(args, n || 0); }
exports.isArray = function(input) { return Object.prototype.toString.call(input) === '[object Array]'; }

exports.shallowCopy = function(input) {
	if (exports.isArray(input)) {
		return input.slice(0);
	} else {
		var out = {};
		for (var key in input) {
			if (input.hasOwnProperty(key)) {
				out[key] = input[key];
			}
		}
	}
	
	return out;
}

exports.merge = function(base, extra) {
	base = base || {};
	
	for (var i = 1, len = arguments.length; i < len; ++i) {
		var copyFrom = arguments[i];
		for (var key in copyFrom) {
			if (copyFrom.hasOwnProperty(key) && !base.hasOwnProperty(key)) {
				base[key] = copyFrom[key];
			}
		}
	}
	
	return base;
}

exports.curry = function(method /*, VARGS*/) {
	var args = SLICE.call(arguments, 1),
		f = typeof method == 'string'
				? function() { this[method].apply(ctx, args.concat(SLICE.call(arguments))); }
				: function() { method.apply(this, args.concat(SLICE.call(arguments))); }
	f.curried = true;
	return f;
}

exports.unbind = function(method /*, VARGS*/) {
	var args = SLICE.call(arguments, 1),
		f = typeof method == 'string'
				? function(ctx) { ctx[method].apply(ctx, args.concat(SLICE.call(arguments, 1))); }
				: function(ctx) { method.apply(ctx, args.concat(SLICE.call(arguments, 1))); }
	f.unbound = true;
	return f;
}

