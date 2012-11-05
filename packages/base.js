/**
 * base.js
 * This file contains all global functions provided by js.io.
 */

exports.log = jsio.__env.log;
exports.GLOBAL = jsio.__env.global;

/**
 * Various polyfill methods to ensure js.io implementations provide
 * a baseline of JavaScript functionality. Feature compatibility (localStorage,
 * etc.) should be provided elsewhere.
 */

// Array.isArray
// Not available before ECMAScript 5.
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/isArray

if (!Array.isArray) {
	Array.isArray = function (arg) {
		return Object.prototype.toString.call(arg) === '[object Array]';
	}
};

// Function.prototype.bind
// Not available before ECMAScript 5.
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind

if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1), 
        fToBind = this, 
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP
                                 ? this
                                 : oThis,
                               aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

/**
 * DEPRECATED. Old js.io polyfills.
 */

var SLICE = Array.prototype.slice;

/* Use native isArray if available
 */
if (typeof Array.isArray === 'function') {
	exports.isArray = Array.isArray;
} else {
	exports.isArray = function (obj) {
		return Object.prototype.toString.call(obj) === '[object Array]';
	}
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

/**
 * Class constructor.
 */

exports.Class = function(name, parent, proto) {
	return exports.__class__(function() { return this.init && this.init.apply(this, arguments); }, name, parent, proto);
}

exports.__class__ = function (cls, name, parent, proto) {
	var clsProto = function () {};
	var logger;

	if (typeof name != 'string') {
		proto = parent;
		parent = name;
		name = null;
	}

	if (name) {
		logger = exports.logging.get(name);
	}

	if (!parent) { throw new Error('parent or prototype not provided'); }
	if (!proto) { proto = parent; parent = null; }

	if (parent) {
		if (exports.isArray(parent)) { // multiple inheritance, use at your own risk =)
			clsProto.prototype = {};
			for(var i = 0, p; p = parent[i]; ++i) {
				if (p == Error && ErrorParentClass) { p = ErrorParentClass; }
				for (var item in p.prototype) {
					if (!(item in clsProto.prototype)) {
						clsProto.prototype[item] = p.prototype[item];
					}
				}
			}
			parent = parent[0];
		} else {
			if (parent == Error && ErrorParentClass) { parent = ErrorParentClass; }
			clsProto.prototype = parent.prototype;
		}
	}
	
	var supr = parent ? function(context, method, args) {
			var f = parent.prototype[method];
			if (!f) { throw new Error('method ' + method + ' does not exist'); }
			return f.apply(context, args || []);
		} : null;
	
	var p = cls.prototype = new clsProto();
	p.constructor = cls;
	p.__parentClass__ = parent;
	if (name) { p.__class__ = name; }
	proto.call(p, logger || supr, logger && supr);
	return cls;
}

var ErrorParentClass = exports.__class__(function ErrorCls() {
		var err = Error.prototype.constructor.apply(this, arguments);
		for (var prop in err) {
			if (err.hasOwnProperty(prop)) {
				this[prop] = err[prop];
			}
		}
	}, function() {});

/**
 * Merge two objects together.
 */

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

/**
 * Create a timer delay.
 */

exports.delay = function(orig, timeout) {
	var _timer = null;
	var ctx, args;
	var f = function() { orig.apply(ctx, args); }
	return function() {
		ctx = this;
		args = arguments;
		if (_timer) { clearTimeout(_timer); }
		_timer = setTimeout(f, timeout || 0);
	}
}

/**
 * Log constructor and default "logger".
 */

exports.logging = (function() {
	
	// logging namespace, this is what is exported
	var logging = {
			DEBUG: 1,
			LOG: 2,
			INFO: 3,
			WARN: 4,
			ERROR: 5,
			NONE: 10
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
	
	var Logger = exports.__class__(
		function Logger(name, level) {
			this._name = name;
			this._level = level || logging.LOG;
		},
		function () {
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
