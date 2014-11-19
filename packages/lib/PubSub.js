/**
 * Summary: inherit from lib.PubSub if a class wants publish/subscribe ability
 * Methods:
 *  - publish(signal, args...) - all subscribers to signal will be called
 *     with the list of arguments provided.
 *  - subscribe(signal, ctx, method, args...) - register a bound method
 *     to a signal.  Any args that are passed in will be the first args
 *     when the method is invoked during a publish.
 *  Usage notes: There is one special signal '__any'.  Any subscribers to
 *     '__any' will be called on every publish with the first publish
 *     argument being the signal itself (after any args passed in during
 *     the corresponding subscribe).
 *     Calling the super constructor is not required for descendants of
 *     lib.PubSub.
 */

from ..std.uuid import uuid;

var ctx = jsio.__env.global,
	SLICE = Array.prototype.slice;

exports = Class(function () {

	this.init = function () {};

	this.publish = function (signal) {
		if (this._subscribers) {
			var args = SLICE.call(arguments, 1);
			if (this._subscribers.__any) {
				var anyArgs = [signal].concat(args),
					subs = this._subscribers.__any.slice(0);
				for(var i = 0, sub; sub = subs[i]; ++i) {
					sub.apply(ctx, anyArgs);
				}
			}

			if (!this._subscribers[signal]) {
				return this;
			}

			var subs = this._subscribers[signal].slice(0);
			for (var i = 0, sub; sub = subs[i]; ++i) {
				sub.apply(ctx, args);
			}
		}
		return this;
	};

	this.subscribe = function (signal, ctx, method) {
		var cb;
		if (arguments.length == 2) {
			cb = ctx;
		} else {
			cb = bind.apply(GLOBAL, SLICE.call(arguments, 1));
			cb._ctx = ctx; // references for unsubscription
			cb._method = method;
		}

		var s = this._subscribers || (this._subscribers = {});
		(s[signal] || (s[signal] = [])).push(cb);
		return this;
	};

	this.subscribeOnce = function (signal, ctx, method) {
		var args = arguments,
			cb = bind(this, function () {
				this.unsubscribe(signal, cb);
				if (args.length == 2) {
					ctx.apply(GLOBAL, arguments);
				} else {
					bind.apply(GLOBAL, SLICE.call(args, 1))
						.apply(GLOBAL, arguments);
				}
			});

		if (args.length >= 3) {
			cb._ctx = ctx;
			cb._method = method;
		}

		return this.subscribe(signal, cb);
	};

	// If no method is specified, all subscriptions with a callback context
	// of ctx will be removed.

	this.unsubscribe = function (signal, ctx, method) {
		if (!this._subscribers || !this._subscribers[signal]) {
			return this;
		}
		var subs = this._subscribers[signal];
		for (var i = 0, c; c = subs[i]; ++i) {
			if (c == ctx || c._ctx == ctx && (!method || c._method == method)) {
				subs.splice(i--, 1);
			}
		}
		return this;
	};

	/**
	 * EventEmitter-style API
	 * http://nodejs.org/api/events.html
	 */

	this.listeners = function (type) {
		this._subscribers = (this._subscribers ? this._subscribers : {});
		return (this.hasOwnProperty.call(this._subscribers, type))
			? this._subscribers[type]
			: (this._subscribers[type] = []);
	};

	this.addListener = this.on = function (type, f) {
		if (this.listeners(type).length + 1 > this._maxListeners && this._maxListeners !== 0) {
			if (typeof console !== "undefined") {
				console.warn("Possible EventEmitter memory leak detected. " + this._subscribers[type].length + " listeners added. Use emitter.setMaxListeners() to increase limit.");
			}
		}
		this.emit("newListener", type, f);
		return this.subscribe(type, this, f);
	};

	this.once = function (type, f) {
		return this.subscribeOnce(type, this, f);
	};

	this.removeListener = function (type, f) {
		this.unsubscribe(type, this, f);
		return this;
	};

	this.removeAllListeners = function (type) {
		if (this._subscribers) {
			for (var k in this._subscribers) {
				if (type == null || type == k) {
					delete this._subscribers[k];
				}
			}
		}
		return this;
	};

	this.emit = function (type) {
		this.publish.apply(this, arguments);
		return this.listeners(type).length > 0;
	};

	this._maxListeners = 10;

	this.setMaxListeners = function (_maxListeners) {
		this._maxListeners = _maxListeners;
	};

	this.hasListeners = function (type) {
		return this._subscribers && this._subscribers[type] && this._subscribers[type].length;
	};

	/**
	 * listenTo for inverting control of #subscribe, #on, etc.
	 * @param {object} obj something extending js.io's lib.PubSub
	 * @param {string} name the event name to listen to
	 * @param {callback} function to run on event
	 * @return {this}
	 */
	this.listenTo = function (obj, name, callback) {
		var listeningTo = this._listeningTo || (this._listeningTo = {});
		var id = obj._listenId || (obj._listenId = uuid(8, 16));
		listeningTo[id] = obj;
		obj.subscribe(name, this, callback);
		return this;
	};

	/**
	 * Stop listening to objects previously passed to `listenTo`.
	 *
	 * @example
	 *     // Stop listening to all events on all objects
	 *     this.stopListening();
	 *
	 *     // Stop listening to all events on `obj`
	 *     this.stopListening(obj);
	 *
	 *     // Stop all of my callbacks for a given event
	 *     this.stopListening(obj, name);
	 *
	 *     // Stop a single callback from firing
	 *     this.stopListening(obj, name, callback);
	 *
	 * @param {object} [obj] object extending lib.PubSub and using listenTo
	 * @param {string} [name] the event name to listen to
	 * @param {callback} [callback] function to stop running
	 * @return {this}
	 */
	this.stopListening = function (obj, name, callback) {
		var events, names, retain, i, j, k, l, ev;
		var listeningTo = this._listeningTo;
		if (!listeningTo) {
			return this;
		}

		logger.log(obj);
		var remove = !name && !callback;
		if (obj) {
			(listeningTo = {})[obj._listenId] = obj;
		}

		for (var id in listeningTo) {
			obj = listeningTo[id];

			names = name ? [name] : Object.keys(obj._subscribers);
			for (i = 0, l = names.length; i < l; i++) {
				name = names[i];
				if (events = obj._subscribers[name]) {
					obj._subscribers[name] = retain = [];
					for (j = 0, k = events.length; j < k; j++) {
						ev = events[j];
						if ((callback && callback !== ev._method) ||
								(this && this !== ev._ctx)) {
							retain.push(ev);
						}
					}
					if (!retain.length) delete obj._subscribers[name];
				}
			}
			if (remove) {
				delete this._listeningTo[id];
			}
		}
		return this;
	};
});

