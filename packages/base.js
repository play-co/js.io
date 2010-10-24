exports.log = jsio.__env.log;
exports.GLOBAL = jsio.__env.global;

var SLICE = Array.prototype.slice;

exports.bind = function(context, method /*, VARGS*/) {
	if(arguments.length > 2) {
		var args = SLICE.call(arguments, 2);
		return typeof method == 'string'
			? function $$boundMethod() {
				if (context[method]) {
					return context[method].apply(context, args.concat(SLICE.call(arguments, 0)));
				} else {
					throw logger.error('No method:', method, 'for context', context);
				}
			}
			: function $$boundMethod() { return method.apply(context, args.concat(SLICE.call(arguments, 0))); }
	} else {
		return typeof method == 'string'
			? function $$boundMethod() {
				if (context[method]) {
					return context[method].apply(context, arguments);
				} else {
					throw logger.error('No method:', method, 'for context', context);
				}
			}
			: function $$boundMethod() { return method.apply(context, arguments); }
	}
}

exports.Class = function(parent, proto) {
	if(!parent) { throw new Error('parent or prototype not provided'); }
	if(!proto) { proto = parent; parent = null; }
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
	cls.prototype = new proto(parent ? function(context, method, args) {
		var args = args || [];
		var target = proto;
		while(target = target.prototype) {
			if(target[method]) {
				return target[method].apply(context, args);
			}
		}
		throw new Error('method ' + method + ' does not exist');
	} : null);
	cls.prototype.constructor = cls;
	return cls;
}

exports.$setTimeout = function(f, t/*, VARGS */) {
	var args = SLICE.call(arguments, 2);
	return setTimeout(function() {
		try {
			f.apply(this, args);
		} catch(e) {
			// log?
		}
	}, t)
}

exports.$setInterval = function(f, t/*, VARGS */) {
	var args = SLICE.call(arguments, 2);
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
			this._listener = exports.log;
		}
		
		this.setLevel = function(level) { this._level = level; }
	
		function makeLogFunction(level, type) {
			return function() {
				if (!production && level >= this._level) {
					var prefix = type + ' ' + gPrefix + this._name;
					return this._listener.apply(this._listener, [prefix].concat(SLICE.call(arguments)));
				}
				return arguments[0];
			}
		}
	
		this.setListener = function(listener) { log = listener; }
		this.debug = makeLogFunction(logging.DEBUG, "DEBUG");
		this.log = makeLogFunction(logging.LOG, "LOG");
		this.info = makeLogFunction(logging.INFO, "INFO");
		this.warn = makeLogFunction(logging.WARN, "WARN");
		this.error = makeLogFunction(logging.ERROR, "ERROR");
	});

	return logging;
})();

var logger = exports.logging.get('jsiocore');
