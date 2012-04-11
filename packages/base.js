/**
 * js.io base functions.
 * A collection of utility functions added to the global scope.
 * @namespace
 */

var SLICE = Array.prototype.slice;

/**
 * The global object.
 * @property
 */
exports.GLOBAL = jsio.__env.global;


/**
 * Returns true is an object is an array, false if it is not. Use native isArray if available.
 * @param {*} obj
 * @return {boolean}
 */
if (typeof Array.isArray === 'function') {
	exports.isArray = Array.isArray;
} else {
	exports.isArray = function (obj) {
		return Object.prototype.toString.call(obj) === '[object Array]';
	}
}

/**
 * Creates a new function that, when called, calls the given function with the context provided as the 'this' value.
 * !!perhaps there is a way to conform the native Function.prototype.bind to this for performnce?
 *
 * @param {} context The object to specify as 'this' in the bound function.
 * @param {function} method Function to bind to a new context.
 * @param {... *} VARGS Arguments to apply to the given function.
 @ return {function}
 */
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
 * Creates a new constructor function, and make it a subclass of the parent if provided.
 * @param {string=} name Optionally assign the new constructor function a name, assigned as an object property.
 * @param {function=} parent The class to inherit from. If omitted, then create a new class with no superclass.
 * @param {function} proto
 * @return {constructor}
 *
 * The returned construtor contains the following prototype properties:
 * @property {function} constructor
 * @property {Class} __parentClass__
 * @property {string} __class__
 */
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

	/**
	 * Instantiate the proto function and assign it as the prototype of the new class object.
	 * @property {object} 
	 */
	cls.prototype = new proto(logger || supr, logger && supr);
	cls.prototype.constructor = cls;

	/**
	 * @private
	 * @property
	 */
	cls.prototype.__parentClass__ = parent;

	/**
	 * Name of class, set as optional first argument to Class. If none given, this is undefined.
	 * @private
	 * @property {string|undefined}
	 */
	if (name) { cls.prototype.__class__ = name; }
	
	return cls;
}

/**
 * @extends {Error}
 */
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

/**
 * Used to be used to initialize classes and call init, but this tends to be done explictly.
 * @deprecated
 * @param {} proto
 * @param {} supr
 * @param {} defaults
 * @param {} post
 */
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

/**
 * Combine the properties of multiple objects.
 * @param {object} base
 * @param {object} extra
 * @param {... object} VARGS
 * @rerturn {object} Returns the first object argument, with the properties of subsequent objects added.
 */
exports.merge = exports.Class.defaults = function(base, extra /*, VARGS*/) {
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
 * Returns a function that, when called, executes the original function at the given delay.
 * @param {function} orig Function to execute after a specified delay
 * @param {number} timeout Milliseconds to delay function execution
 * @return {function}
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
 * Print arguments to screen
 * @params {... *} VARGS Arguments to log to the console for inspection.
 * @return {string} Arguments concatentated together and return as a string.
 */
exports.log = jsio.__env.log;

/**
 * Keep logging local variables out of other closures in this file.
 * !!Maybe this should be in a separate file.
 * @namespace
 */
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

	/**
	 * @param {string} prefix
	 */
	logging.setPrefix = function(prefix) { gPrefix = prefix + ' '; }

	/**
	 * @param {boolean} prod
	 */
	logging.setProduction = function(prod) { production = !!prod; }

	/**
	 * !!Should this really create a new logger if lookup fails?
	 * @param {} name
	 * @return {Logger}
	 */
	logging.get = function(name) {
		return loggers.hasOwnProperty(name) ? loggers[name]
			: (loggers[name] = new Logger(name));
	};

	/**
	 * @param {string} name
	 * @param {} _logger
	 */
	logging.set = function(name, _logger) {
		loggers[name] = _logger;
	};

	/**
	 * @return {object} Collection of all loggers.
	 */
	logging.getAll = function() { return loggers; }

	/**
	 * @private
	 * @param {} pkg
	 * @param {} ctx
	 */
	logging.__create = function(pkg, ctx) { ctx.logger = logging.get(pkg); }

	/**
	 * @constructor
	 */
	var Logger = exports.Class(function() {
		this.init = function(name, level) {

			/**
			 * @private
			 * @property {string}
			 */
			this._name = name;

			/**
			 * @private
			 * @property {number}
			 */
			this._level = level || logging.LOG;
		}

		/**
		 * @param {number}
		 */
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

		/**
		 *
		 */
		this.setListener = function(listener) { this._listener = listener; }

		/**
		 *
		 */
		this.debug = makeLogFunction(logging.DEBUG, "DEBUG");

		/**
		 *
		 */
		this.log = makeLogFunction(logging.LOG, "LOG");

		/**
		 *
		 */
		this.info = makeLogFunction(logging.INFO, "INFO");

		/**
		 *
		 */
		this.warn = makeLogFunction(logging.WARN, "WARN");

		/**
		 *
		 */
		this.error = makeLogFunction(logging.ERROR, "ERROR");
	});

	return logging;
})();

var logger = exports.logging.get('jsiocore');
