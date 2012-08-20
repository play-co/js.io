function createGetter(ctx, name) {
	return function() {
		return this[name];
	}
}

function createSetter(ctx, name, callback, initialValue) {
	if (initialValue !== undefined) {
		ctx[name] = initialValue;
	}
	
	if (typeof callback == 'function') {
		return function(value) {
			if (this[name] !== value) {
				var old = this[name];
				this[name] = value;
				callback.call(this, name, value, old);
			}
		}
	} else if (typeof callback == 'string') {
		return function(value) {
			if (this[name] !== value) {
				var old = this[name];
				this[name] = value;
				this[callback](name, value, old);
			}
		}
	} else {
		return function(value) {
			this[name] = value;
		}
	}
}

exports = function(ctx, name, def) {
	if (!def.get && !def.set && !def.cb && ('value' in def)) {
		ctx[name] = def.value;
	} else {
		if (!def.get) { def.get = createGetter(ctx, '_' + name); }
		if (!def.set) { def.set = createSetter(ctx, '_' + name, def.cb, def.value); }
		if ('value' in def) { ctx['_' + name] = def.value; }

		delete def.value;
		if (Object.defineProperty) {
			Object.defineProperty(ctx, name, def);
			// merge(def, {
			// 				configurable: false,
			// 				enumerable: true
			// 			});
		} else if (ctx.__defineSetter__) {
			ctx.__defineSetter__(name, def.set);
			ctx.__defineGetter__(name, def.get);
		} else {
			ctx[name] = def.value;
		}
	}
}
