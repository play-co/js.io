exports = function() {
	if (arguments.length == 1) {
		if (typeof arguments[0] == 'object') {
			var obj = arguments[0];
			for (var i in obj) {
				if (!(obj[i] in obj)) {
					obj[obj[i]] = i;
				}
			}
			return obj;
		} else if (typeof arguments[0] != 'string') {
			keys = arguments[0];
		}
	}
	
	if (!keys) { var keys = arguments; }
	var obj = {};
	for(var i = 0, len = keys.length; i < len; ++i) {
		if (keys[i]) {
			obj[keys[i]] = i + 1;
		}
		obj[i + 1] = keys[i];
	}
	return obj;
}