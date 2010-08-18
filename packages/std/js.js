exports.vargs = function(args, n) { return Array.prototype.slice.call(args, n || 0); }
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
	
	for (var key in extra) {
		if (extra.hasOwnProperty(key) && !base.hasOwnProperty(key)) {
			base[key] = extra[key];
		}
	}
	
	return base;
}