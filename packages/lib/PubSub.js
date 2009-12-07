jsio('from base import *');

var ctx = jsio.__env.global;

exports = Class(function() {
	this.publish = function(signal) {
		if(!this._subscribers) { return; }
		
		var args = Array.prototype.slice.call(arguments, 1);
		if(this._subscribers.__any) {
			var anyArgs = [signal].concat(args);
			for(var i = 0, sub; sub = this._subscribers.__any[i]; ++i) {
				sub.apply(ctx, args);
			}
		}
		
		if(!this._subscribers[signal]) { return; }		
		for(var i = 0, sub; sub = this._subscribers[signal][i]; ++i) {
			sub.apply(ctx, args);
		}
	}
	
	this.subscribe = function(signal) {
		if(!this._subscribers) { this._subscribers = {}; }
		if(!this._subscribers[signal]) { this._subscribers[signal] = []; }
		this._subscribers[signal].push(bind.apply(ctx, Array.prototype.slice.call(arguments, 1)));
	}
});

