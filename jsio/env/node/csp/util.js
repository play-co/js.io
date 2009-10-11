/*
Helper functions, &c., for a comet server by Jacob Rus.

--------------------

Copyright (c) 2009 Jacob Rus

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

var myClearTimeout = this.myClearTimeout = function (timer) {
	return timer ? clearTimeout(timer) : null;
};

var debug = this.debug = function () {
	var message = [];
	for (var i=0; i < arguments.length; i++) {
		var arg = arguments[i];
		arg = (typeof arg === 'string') ? arg : JSON.stringify(arg)
		message.push(arg);
	};
	node.stdio.writeError(message.join(' ') + '\n');
};


var bind = exports.bind = function(context, method/*, arg1, arg2, ... */){
	var args = Array.prototype.slice.call(arguments, 2);
	return function() {
		method = (typeof method === 'string' ? context[method] : method);
		return method.apply(context, args.concat(Array.prototype.slice.call(arguments, 0)));
	};
};

var Class = exports.Class = function(parent, proto) {
	if (!parent) { throw new Error('parent or prototype not provided'); };
	if (!proto) {
		proto = parent;
	} else if (parent instanceof Array) { // multiple inheritance, use at your own risk =)
		proto.prototype = {};
		for (var i = 0, p; p = parent[i]; ++i) {
			for (var item in p.prototype) {
				if (!(item in proto.prototype)) {
					proto.prototype[item] = p.prototype[item];
				};
			};
		};
		parent = parent[0]; 
	} else {
		proto.prototype = parent.prototype;
	};
	
	var cls = function() { if(this.init) { this.init.apply(this, arguments); }}
	cls.prototype = new proto(function(context, method, args) {
		var args = args || [];
		var target = parent;
		while(target = target.prototype) {
			if(target[method]) {
				return target[method].apply(context, args);
			}
		}
		throw new Error('method ' + method + ' does not exist');
	});
	cls.prototype.constructor = cls;
	return cls;
};

// helper to make a hash table from the arguments for membership testing
// Use like: 'a' in Set('a', 'b', 'c')
var Set = this.Set = function () {
	var set = {};
	var len = arguments.length;
	for (var i=0; i < len; i++) {
		set[arguments[i]] = true;
	};
	return set;
};

// helper to test if string 2 is at the beginning of string 1
var startswith = this.startswith = function (str1, str2) {
	return str1.slice(0, str2.length) == str2;
};

var JSIOError = this.JSIOError = Class(Error, function () {
	this.name = 'JSIOError';
	this.toString = Error.prototype.toString;
	this.init = function (message, fileName, lineNumber) {
		this.name = this.name; // promote class property to instance
    this.message = message || '';
		this.fileName = fileName || '«filename»'; // location.href; // XXX what should go here?
		this.lineNumber = isNaN(+lineNumber) ? 0 : +lineNumber
	};
})

var AssertionError = this.AssertionError = Class(JSIOError, function (supr) {
	this.name = 'AssertionError'
	this.init = function () {supr(this, 'init', arguments)}
});
var assert = this.assert = function (exp, message) {
	if (!exp) {
		throw new AssertionError(message)
	};
};

// schedule a callback to run at the next available moment,
// equivalent to setTimeout(callback, 0)
var reschedule = this.reschedule = function (callback) {
	var timer = new node.Timer(); 
	timer.addListener('timeout', callback);
	timer.start(0, 0);
	return timer;
}

// cached static files
var staticFile = this.staticFile = function (){
	var cache = {} // static file content indexed by filename
	var getfile = function(path) {
		promise = new node.Promise();
		cacheContent = cache[path];
		if (cacheContent !== undefined) {
			// the file is in the cache, return it
			reschedule(function(){
				promise.emitSuccess([cacheContent]);
			});
		} else {
			// load file from disk, save it in the cache, and return it
			node.fs.cat(path, 'utf8')
				.addCallback(function(fileContent) {
					cache[path] = fileContent;
					promise.emitSuccess([fileContent]);
				})
				.addErrback(function(){
					promise.emitError();
				});
		};
		return promise;
	};
	return getfile;
}();

var CreateClass = this.CreateClass = function(target) {
	target.init.prototype = target;
	return target.init;
}