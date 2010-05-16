exports.Later = Class(function() {
	this.init = function() {
		this.cb = null
		this.eb = null
		this.values = []
		this.errors = []
		this.cancelback = null;
	}
	
	this.succeed = function(data) {
		this.callback(data);
	}
	
	this.callback = function() {
		logger.debug('callback', [].slice.call(arguments, 0));
		if (this.cb) {
			var result = this.cb.apply(this, arguments);
			if (result == false) {
				this.cancel();
			}
		} else {
			this.values.push(arguments);
		}
	}

	this.errback = function() {
		logger.debug('eb', [].slice.call(arguments, 0));
		if (this.eb) {
			this.eb.apply(this, arguments);
		}
		else {
			this.errors.push(arguments);
		}
	}

   this.cancel = function() {
		if (this.cancelback) {
			var cb = this.cancelback;
			this.cancelback = null;
			cb.call(this);
		}
	}
	this.setCallback = function(cb) {
		this.cb = cb;
		for (var i = 0, v; v=this.values[i]; ++i) {
			this.cb.apply(this, v);
		}
		this.values = [];
		return this;
	}
	this.setErrback = function(eb) {
		this.eb = eb;
		for (var i = 0, v; e=this.errors[i]; ++i) {
			this.eb.apply(this, e);
		}
		this.errors = [];
		return this;
	}
	this.setCancelback = function(cancelback) {
		this.cancelback = cancelback;
		return this;
	}
})
