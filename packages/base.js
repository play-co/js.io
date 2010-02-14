exports.log = jsio.__env.log;

exports.bind = function(context, method /*, VARGS*/) {
	if(arguments.length > 2) {
		var args = Array.prototype.slice.call(arguments, 2);
		return typeof method == 'string'
			? function() { return context[method].apply(context, args.concat(Array.prototype.slice.call(arguments, 0))); }
			: function() { return method.apply(context, args.concat(Array.prototype.slice.call(arguments, 0))); }
	} else {
		return typeof method == 'string'
			? function() { exports.log('crash?', method, context, arguments); return context[method].apply(context, arguments); }
			: function() { return method.apply(context, arguments); }
	}
}

exports.Class = function(parent, proto) {
	if(!parent) { throw new Error('parent or prototype not provided'); }
	if(!proto) { proto = parent; }
	else if(parent instanceof Array) { // multiple inheritance, use at your own risk =)
		proto.prototype = {};
		for(var i = 0, p; p = parent[i]; ++i) {
			for(var item in p.prototype) {
				if(!(item in proto.prototype)) {
					proto.prototype[item] = p.prototype[item];
				}
			}
		}
		parent = parent[0]; 
	} else { 
		proto.prototype = parent.prototype;
	}

	var cls = function() { if(this.init) { return this.init.apply(this, arguments); }}
	cls.prototype = new proto(function(context, method, args) {
		var args = args || [];
		var target = proto;
		while(target = target.prototype) {
			if(target[method]) {
				return target[method].apply(context, args);
			}
		}
		throw new Error('method ' + method + ' does not exist');
	});
	cls.prototype.constructor = cls;
	return cls;
}

exports.$setTimeout = function(f, t/*, VARGS */) {
	var args = Array.prototype.slice.call(arguments, 2);
	return setTimeout(function() {
		try {
			f.apply(this, args);
		} catch(e) {
			// log?
		}
	}, t)
}

exports.$setInterval = function(f, t/*, VARGS */) {
	var args = Array.prototype.slice.call(arguments, 2);
	return setInterval(function() {
		try {
			f.apply(this, args);
		} catch(e) {
			// log?
		}
	}, t)
}

// node doesn't let you call clearTimeout(null)
exports.$clearTimeout = function (timer) { return timer ? clearTimeout(timer) : null; };
exports.$clearInterval = function (timer) { return timer ? clearInterval(timer) : null; };
