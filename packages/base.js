exports.log = jsio.__env.log;
exports.GLOBAL = jsio.__env.global;

var SLICE = Array.prototype.slice;

exports.isArray = function(obj) {
	return Object.prototype.toString.call(obj) === '[object Array]';
}

exports.bind = function(context, method /*, VARGS*/) {
	if(arguments.length > 2) {
		var args = SLICE.call(arguments, 2);
		return typeof method == 'string'
			? function __bound() {
				if (context[method]) {
					return context[method].apply(context, args.concat(SLICE.call(arguments, 0)));
				} else {
					throw logger.error('No method:', method, 'for context', context);
				}
			}
			: function __bound() { return method.apply(context, args.concat(SLICE.call(arguments, 0))); }
	} else {
		return typeof method == 'string'
			? function __bound() {
				if (context[method]) {
					return context[method].apply(context, arguments);
				} else {
					throw logger.error('No method:', method, 'for context', context);
				}
			}
			: function __bound() { return method.apply(context, arguments); }
	}
}

exports.Class = function(parent, proto) {
	if (typeof parent == 'string') {
		var name = arguments[0],
			parent = arguments[1],
			proto = arguments[2],
			logger = exports.logging.get(name);
	}
	
	if (!parent) { throw new Error('parent or prototype not provided'); }
	if (!proto) { proto = parent; parent = null; }
	else if (exports.isArray(parent)) { // multiple inheritance, use at your own risk =)
		proto.prototype = {};
		for(var i = 0, p; p = parent[i]; ++i) {
			if (p == Error && ErrorParentClass) { p = ErrorParentClass; }
			for (var item in p.prototype) {
				if (!(item in proto.prototype)) {
					proto.prototype[item] = p.prototype[item];
				}
			}
		}
		parent = parent[0]; 
	} else {
		if (parent == Error && ErrorParentClass) { parent = ErrorParentClass; }
		proto.prototype = parent.prototype;
	}
	
	var cls = function() { if (this.init) { return this.init.apply(this, arguments); }},
		supr = parent ? function(context, method, args) {
			var f = parent.prototype[method];
			if (!f) { throw new Error('method ' + method + ' does not exist'); }
			return f.apply(context, args || []);
		} : null;
	
	cls.prototype = new proto(logger || supr, logger && supr);
	cls.prototype.constructor = cls;
	cls.prototype.__parentClass__ = parent;
	if (name) { cls.prototype.__class__ = name; }
	return cls;
}

var ErrorParentClass = exports.Class(Error, function() {
	this.init = function() {
		var err = Error.prototype.constructor.apply(this, arguments);
		for (var prop in err) {
			if (err.hasOwnProperty(prop)) {
				this[prop] = err[prop];
			}
		}
	}
});

exports.Class.defaults = 
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

exports.delay = function(orig, timeout) {
	var _timer = null;
	var ctx, args;
	var f = function() { orig.apply(ctx, arguments); }
	return function() {
		ctx = this;
		args = arguments;
		if (_timer) { clearTimeout(_timer); }
		_timer = setTimeout(f, timeout || 0);
	}
}

exports.Class.ctor = function(proto, supr, defaults, post) {
	if (!supr) {
		supr = function(ctx, method, args) {
			ctx._opts = args[0];
		}
	}

	if (post) {
		proto.init = function(opts) {
			supr(this, 'init', [opts = exports.merge(opts, defaults)]);
			post.apply(this, [opts].concat(SLICE.call(arguments, 1)));
		}
	} else {
		proto.init = function(opts) {
			supr(this, 'init', [exports.merge(opts, defaults)]);
		}
	}
}

// keep logging local variables out of other closures in this file!
exports.logging = (function() {
	
	// logging namespace, this is what is exported
	var logging = {
			DEBUG: 1,
			LOG: 2,
			INFO: 3,
			WARN: 4,
			ERROR: 5
		},
		loggers = {}, // effectively globals - all loggers and a global production state
		production = false;
	var gPrefix = '';
	logging.setPrefix = function(prefix) { gPrefix = prefix + ' '; }
	logging.setProduction = function(prod) { production = !!prod; }
	logging.get = function(name) {
		return loggers.hasOwnProperty(name) ? loggers[name]
			: (loggers[name] = new Logger(name));
	}
	logging.set = function(name, _logger) {
		loggers[name] = _logger;
	}
	
	logging.getAll = function() { return loggers; }

	logging.__create = function(pkg, ctx) { ctx.logger = logging.get(pkg); }
	
	var Logger = exports.Class(function() {
		this.init = function(name, level) {
			this._name = name;
			this._level = level || logging.LOG;
		}
		
		this.setLevel = function(level) { this._level = level; }
	
		function makeLogFunction(level, type) {
			return function() {
				if (!production && level >= this._level) {
					var prefix = type + ' ' + gPrefix + this._name,
						listener = this._listener || exports.log;
					
					return listener && listener.apply(this._listener, [prefix].concat(SLICE.call(arguments)));
				}
				return arguments[0];
			}
		}
	
		this.setListener = function(listener) { this._listener = listener; }
		this.debug = makeLogFunction(logging.DEBUG, "DEBUG");
		this.log = makeLogFunction(logging.LOG, "LOG");
		this.info = makeLogFunction(logging.INFO, "INFO");
		this.warn = makeLogFunction(logging.WARN, "WARN");
		this.error = makeLogFunction(logging.ERROR, "ERROR");
	});

	return logging;
})();

var logger = exports.logging.get('jsiocore');
