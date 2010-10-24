var ctx = jsio.__env.global;

exports = Class(function() {
	this.publish = function(signal) {
		if(this._subscribers) {
			var args = Array.prototype.slice.call(arguments, 1);
			if(this._subscribers.__any) {
				var anyArgs = [signal].concat(args),
					subs = this._subscribers.__any.slice(0);
				for(var i = 0, sub; sub = subs[i]; ++i) {
					sub.apply(ctx, anyArgs);
				}
			}
			
			if(!this._subscribers[signal]) { return; }
			
			var subs = this._subscribers[signal].slice(0);
			for(var i = 0, sub; sub = subs[i]; ++i) {
				sub.apply(ctx, args);
			}
		}
		return this;
	}
	
	this.subscribe = function(signal, ctx, method) {
		if(!this._subscribers) { this._subscribers = {}; }
		if(!this._subscribers[signal]) { this._subscribers[signal] = []; }
		var cb = bind.apply(ctx, Array.prototype.slice.call(arguments, 1));
		cb._ctx = ctx; // references for unsubscription
		cb._method = method;
		this._subscribers[signal].push(cb);
		return this;
	}
	
	// if no method is specified, all subscriptions with a callback context of ctx will be removed
	this.unsubscribe = function(signal, ctx, method) {
		if (!this._subscribers || !this._subscribers[signal]) { return; }
		var subs = this._subscribers[signal];
		for (var i = 0, c; c = subs[i]; ++i) {
			if (c._ctx == ctx && (!method || c._method == method)) {
				subs.splice(i--, 1);
			}
		}
		return this;
	}
});

