;(function(){

    var preloaded_source = {
        // Insert pre-loaded modules here...
    };

    var pre_require = [
        // Insert pre-require dependancies here
    ];
	
	var exportJsio = false;
	if(typeof exports == 'undefined') {
		window.jsio = bind(this, _require, window, '');
		exports = window.jsio;
	}
	
	exports.getEnvironment = function() {
		if (typeof(node) !== 'undefined' && node.version) {
			return 'node';
		}
		return 'browser';
	};
	
	function bind(context, method/*, arg1, arg2, ... */){
		var args = Array.prototype.slice.call(arguments, 2);
		return function(){
			method = (typeof method == 'string' ? context[method] : method);
			return method.apply(context, args.concat(Array.prototype.slice.call(arguments, 0)))
		}
	};
	
	function Class(parent, proto) {
		if(!parent) { throw new Error('parent or prototype not provided'); }
		if(!proto) { proto = parent; }
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
	}
	
	var modulePathCache = {}
	var getModulePathPossibilities = function(pathString) {
		var isModule = pathString.charAt(pathString.length-1) == '.';
		var segments = pathString.split('.')
		var modPath = segments.join('/');
		var out;
		if (segments[0] in modulePathCache) {
			out = [[modulePathCache[segments[0]] + '/' + modPath + (isModule ? '__init__.js' : '.js'), null]]
		} else {
			out = [];
			for (var i = 0, path; path = exports.path[i]; ++i) {
				out.push([path + '/' + modPath + (isModule ? '__init__.js' : '.js'), path])
			}
		}
		log(out);
		return out;
	}
	
	exports.path = ['.'];
	switch(exports.getEnvironment()) {
		case 'node':
			var log = function() {
				for (var i = 0, item; item=arguments[i]; ++i) {
					if (typeof(item) == 'object') {
						arguments[i] = JSON.stringify(arguments[i]);
					}
				}
				node.stdio.writeError([].slice.call(arguments, 0).join(' ') + "\n");
			}
			
			window = process;
			var compile = function(context, args) {
				var fn = node.compile("function(_){with(_){delete _;(function(){" + args.src + "\n})()}}", args.url);
				fn.call(context.exports, context);
			}

			var windowCompile = function(context, args) {
				var fn = node.compile("function(_){with(_){with(_.window){delete _;(function(){" + args.src + "\n})()}}}", args.url);
				fn.call(context.exports, context);
			}
			
			var cwd = node.cwd();
			var makeRelative = function(path) {
				var i = path.match('^' + cwd);
				if (i && i[0] == cwd) {
					var offset = path[cwd.length] == '/' ? 1 : 0
					return path.slice(cwd.length + offset);
				}
				return path;
			}
			
			var getModuleSourceAndPath = function(pathString) {
				var baseMod = pathString.split('.')[0];
				var urls = getModulePathPossibilities(pathString);
				var cwd = node.cwd() + '/';
				for (var i = 0, url; url = urls[i]; ++i) {
					var cachePath = url[1];
					var url = url[0];
					try {
						var out = {src: node.fs.cat(url, "utf8").wait(), url: url};
						if (!(baseMod in modulePathCache)) {
							modulePathCache[baseMod] = cachePath;
						}
						return out;
					} catch(e) {}
				}
				throw new Error("Module not found: " + pathString);
			}
			
			var segments = __filename.split('/');

			var jsioPath = segments.slice(0,segments.length-2).join('/');
			if (jsioPath) {
				exports.path.push(jsioPath);
				modulePathCache.jsio = jsioPath;
			} else {
				modulePathCache.jsio = '.';
			}
			break;
		default:
			var log = function() {
				if (typeof console != 'undefined' && console.log) {
					console.log.apply(console, arguments);
				}
			}
			
			var compile = function(context, args) {
				var code = "var fn = function(_){with(_){delete _;(function(){" + args.src + "\n}).call(this)}}\n//@ sourceURL=" + args.url;
				eval(code);
				try {
					fn.call(context.exports, context);
				} catch(e) {}
			}

			var windowCompile = function(context, args) {
				var f = "var fn = function(_){with(_){with(_.window){delete _;(function(){" + args.src + "\n}).call(this)}}}\n//@ sourceURL=" + args.url;
				eval(f);
				fn.call(context.exports, context);
			}
			
			var makeRelative = function(path) {
				return path;
			}
			
			var createXHR = function() {
				return window.XMLHttpRequest ? new XMLHttpRequest() 
					: window.ActiveXObject ? new ActiveXObject("Msxml2.XMLHTTP")
					: null;
			}
			
			var getModuleSourceAndPath = function(pathString) {
                if (preloaded_source[pathString]) {
                    return preloaded_source[pathString];
                }
				var baseMod = pathString.split('.')[0];
				var urls = getModulePathPossibilities(pathString);
				for (var i = 0, url; url = urls[i]; ++i) {
					var cachePath = url[1];
					var url = url[0];
					var xhr = createXHR();
					var failed = false;
					try {
						xhr.open('GET', url, false);
						xhr.send(null);
					} catch(e) {
						failed = true;
					}
					if (failed || // firefox file://
						xhr.status == 404 || // all browsers, http://
						xhr.status == -1100 || // safari file://
						// XXX: We have no way to tell in opera if a file exists and is empty, or is 404
						// XXX: Use flash?
						//(!failed && xhr.status == 0 && !xhr.responseText && EXISTS)) // opera
						false)
					{
						continue;
					}
					if (!(baseMod in modulePathCache)) {
						modulePathCache[baseMod] = cachePath;
					}
					return {src: xhr.responseText, url: url};
				}
				throw new Error("Module not found: " + pathString);
			}
			
			try {
				var scripts = document.getElementsByTagName('script');
				for (var i = 0, script; script = scripts[i]; ++i) {
					if(/jsio\/jsio\.js$/.test(script.src)) {
						var segments = script.src.split('/');
						var jsioPath = segments.slice(0,segments.length-2).join('/') || '.';
						exports.path.push(jsioPath);
						modulePathCache.jsio = jsioPath;
						break;
					}
				}
			} catch(e) {}
			break;
	}
	exports.basePath = exports.path[exports.path.length-1];
	var modules = {jsio: exports, bind: bind, Class: Class, log: log};
	
	function copyToContext(context, pkg, as) {
		var segments = item.from.split('.');
		
		// Remove any trailing dot(s)
		while (segments[segments.length-1] == "") { segments.pop(); }
		var c = context;
		var len = segments.length - 1;
		for(var i = 0, segment; (segment = segments[i]) && i < len; ++i) {
			if(!segment) continue;
			if (!c[segment]) {
				c[segment] = {};
			}
			c = c[segment]
		}
		c[segments[len]] = modules[pkg];
	}
	
	function _require(context, path, what) {
		// parse the what statement
		var match, imports = [];
		if((match = what.match(/^from\s+([\w.]+)\s+import\s+(.*)$/))) {
			imports[0] = {from: match[1], import: {}};
			match[2].replace(/\s*([\w.]+)(?:\s+as\s+([\w.]+))?/g, function(a, b, c) {
				imports[0].import[b] = c || b;
			});
		} else if((match = what.match(/^import\s+(.*)$/))) {
			match[1].replace(/\s*([\w.]+)(?:\s+as\s+([\w.]+))?,?/g, function(a, b, c) {
				imports[imports.length] = c ? {from: b, as: c} : {from: b};
			});
		} else if((match = what.match(/^external\s+(.*)$/))) {
			imports[0] = {from: match[1], external: true, import: {}};
			match[2].replace(/\s*([\w.]+)(?:\s+as\s+([\w.]+))?/g, function(a, b, c) {
				imports[0].import[b] = c || b;
			});
		}
		
		// import each item in the what statement
		for(var i = 0, len = imports.length; (item = imports[i]) || i < len; ++i) {
			var pkg = item.from;
			
			// resolve relative paths
			if(pkg.charAt(0) == '.') {
				pkg = pkg.substring(1);
				var segments = path.split('.');
				while(pkg.charAt(0) == '.') {
					pkg = pkg.slice(1);
					segments.pop();
				}
				
				var prefix = segments.join('.');
				if (prefix) { pkg = prefix + '.' + pkg; }
			}
			
			// eval any packages that we don't know about already
			var segments = pkg.split('.');
			if(!(pkg in modules)) {
				var result = getModuleSourceAndPath(pkg);
				var newRelativePath = segments.slice(0, segments.length - 1).join('.');
				var newContext = {};
				if(!item.external) {
					newContext.exports = {};
					newContext.global = window;
					newContext.jsio = bind(this, _require, newContext, newRelativePath);

					// TODO: FIX for "trailing ." case
					var tmp = result.url.split('/')
					newContext.jsio.__dir = makeRelative(tmp.slice(0,tmp.length-1).join('/'));
					newContext.jsio.__path = makeRelative(result.url);
					
					compile(newContext, result);
					modules[pkg] = newContext.exports;
				} else {
					newContext['window'] = {};
					for(var j in item.import) {
						newContext['window'][j] = null;
					}
					windowCompile(newContext, result);
					modules[pkg] = newContext.window;
				}
			}
			
			if(item.as) {
				copyToContext(context, pkg, item.as);
			} else if(item.import) {
				if(item.import['*']) {
					for(var i in modules[pkg]) { context[i] = modules[pkg][i]; }
				} else {
					for(var j in item.import) { context[item.import[j]] = modules[pkg][j]; }
				}
			} else {
				copyToContext(context, pkg, item.from);
			}
		}
	}
	
	// create the internal require function bound to a local context
	var _localContext = {jsio: bind(this, _require, _localContext, '')};
	var jsio = _localContext.jsio;
	
	jsio('import .env');
	exports.listen = function(server, transportName, opts) {
		var listener = new (jsio.env.getListener(transportName))(server, opts);
		listener.listen();
		return listener;
	}
	
	exports.connect = function(protocolInstance, transportName, opts) {
		var connector = new (jsio.env.getConnector(transportName))(protocolInstance, opts);
		connector.connect();
		return connector;
	}
	exports.quickServer = function(protocolClass) {
		jsio('import .interfaces');
		return new jsio.interfaces.Server(protocolClass);
	}
	
    for (var i =0, target; target=pre_require[i]; ++i) {
        exports.require(target);    
    }
})();





/*
	http://www.JSON.org/json2.js
	2009-08-17

	Public Domain.

	NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

	See http://www.JSON.org/js.html

	This file creates a global JSON object containing two methods: stringify
	and parse.

		JSON.stringify(value, replacer, space)
			value		any JavaScript value, usually an object or array.

			replacer	an optional parameter that determines how object
						values are stringified for objects. It can be a
						function or an array of strings.

			space		an optional parameter that specifies the indentation
						of nested structures. If it is omitted, the text will
						be packed without extra whitespace. If it is a number,
						it will specify the number of spaces to indent at each
						level. If it is a string (such as '\t' or '&nbsp;'),
						it contains the characters used to indent at each level.

			This method produces a JSON text from a JavaScript value.

			When an object value is found, if the object contains a toJSON
			method, its toJSON method will be called and the result will be
			stringified. A toJSON method does not serialize: it returns the
			value represented by the name/value pair that should be serialized,
			or undefined if nothing should be serialized. The toJSON method
			will be passed the key associated with the value, and this will be
			bound to the value

			For example, this would serialize Dates as ISO strings.

				Date.prototype.toJSON = function (key) {
					function f(n) {
						// Format integers to have at least two digits.
						return n < 10 ? '0' + n : n;
					}

					return this.getUTCFullYear()   + '-' +
						 f(this.getUTCMonth() + 1) + '-' +
						 f(this.getUTCDate())	   + 'T' +
						 f(this.getUTCHours())	   + ':' +
						 f(this.getUTCMinutes())   + ':' +
						 f(this.getUTCSeconds())   + 'Z';
				};

			You can provide an optional replacer method. It will be passed the
			key and value of each member, with this bound to the containing
			object. The value that is returned from your method will be
			serialized. If your method returns undefined, then the member will
			be excluded from the serialization.

			If the replacer parameter is an array of strings, then it will be
			used to select the members to be serialized. It filters the results
			such that only members with keys listed in the replacer array are
			stringified.

			Values that do not have JSON representations, such as undefined or
			functions, will not be serialized. Such values in objects will be
			dropped; in arrays they will be replaced with null. You can use
			a replacer function to replace those with JSON values.
			JSON.stringify(undefined) returns undefined.

			The optional space parameter produces a stringification of the
			value that is filled with line breaks and indentation to make it
			easier to read.

			If the space parameter is a non-empty string, then that string will
			be used for indentation. If the space parameter is a number, then
			the indentation will be that many spaces.

			Example:

			text = JSON.stringify(['e', {pluribus: 'unum'}]);
			// text is '["e",{"pluribus":"unum"}]'


			text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
			// text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

			text = JSON.stringify([new Date()], function (key, value) {
				return this[key] instanceof Date ?
					'Date(' + this[key] + ')' : value;
			});
			// text is '["Date(---current time---)"]'


		JSON.parse(text, reviver)
			This method parses a JSON text to produce an object or array.
			It can throw a SyntaxError exception.

			The optional reviver parameter is a function that can filter and
			transform the results. It receives each of the keys and values,
			and its return value is used instead of the original value.
			If it returns what it received, then the structure is not modified.
			If it returns undefined then the member is deleted.

			Example:

			// Parse the text. Values that look like ISO date strings will
			// be converted to Date objects.

			myData = JSON.parse(text, function (key, value) {
				var a;
				if (typeof value === 'string') {
					a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
					if (a) {
						return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
							+a[5], +a[6]));
					}
				}
				return value;
			});

			myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
				var d;
				if (typeof value === 'string' &&
						value.slice(0, 5) === 'Date(' &&
						value.slice(-1) === ')') {
					d = new Date(value.slice(5, -1));
					if (d) {
						return d;
					}
				}
				return value;
			});


	This is a reference implementation. You are free to copy, modify, or
	redistribute.

	This code should be minified before deployment.
	See http://javascript.crockford.com/jsmin.html

	USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
	NOT CONTROL.
*/

/*jslint evil: true */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
	call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
	getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
	lastIndex, length, parse, prototype, push, replace, slice, stringify,
	test, toJSON, toString, valueOf
*/

"use strict";

// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (!this.JSON) {
	this.JSON = {};
}

(function () {

	function f(n) {
		// Format integers to have at least two digits.
		return n < 10 ? '0' + n : n;
	}

	if (typeof Date.prototype.toJSON !== 'function') {

		Date.prototype.toJSON = function (key) {

			return isFinite(this.valueOf()) ?
				   this.getUTCFullYear()   + '-' +
				 f(this.getUTCMonth() + 1) + '-' +
				 f(this.getUTCDate())	   + 'T' +
				 f(this.getUTCHours())	   + ':' +
				 f(this.getUTCMinutes())   + ':' +
				 f(this.getUTCSeconds())   + 'Z' : null;
		};

		String.prototype.toJSON =
		Number.prototype.toJSON =
		Boolean.prototype.toJSON = function (key) {
			return this.valueOf();
		};
	}

	var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
		escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
		gap,
		indent,
		meta = {	// table of character substitutions
			'\b': '\\b',
			'\t': '\\t',
			'\n': '\\n',
			'\f': '\\f',
			'\r': '\\r',
			'"' : '\\"',
			'\\': '\\\\'
		},
		rep;


	function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

		escapable.lastIndex = 0;
		return escapable.test(string) ?
			'"' + string.replace(escapable, function (a) {
				var c = meta[a];
				return typeof c === 'string' ? c :
					'\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
			}) + '"' :
			'"' + string + '"';
	}


	function str(key, holder) {

// Produce a string from holder[key].

		var i,			// The loop counter.
			k,			// The member key.
			v,			// The member value.
			length,
			mind = gap,
			partial,
			value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

		if (value && typeof value === 'object' &&
				typeof value.toJSON === 'function') {
			value = value.toJSON(key);
		}

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

		if (typeof rep === 'function') {
			value = rep.call(holder, key, value);
		}

// What happens next depends on the value's type.

		switch (typeof value) {
		case 'string':
			return quote(value);

		case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

			return isFinite(value) ? String(value) : 'null';

		case 'boolean':
		case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

			return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

		case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

			if (!value) {
				return 'null';
			}

// Make an array to hold the partial results of stringifying this object value.

			gap += indent;
			partial = [];

// Is the value an array?

			if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

				length = value.length;
				for (i = 0; i < length; i += 1) {
					partial[i] = str(i, value) || 'null';
				}

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

				v = partial.length === 0 ? '[]' :
					gap ? '[\n' + gap +
							partial.join(',\n' + gap) + '\n' +
								mind + ']' :
						  '[' + partial.join(',') + ']';
				gap = mind;
				return v;
			}

// If the replacer is an array, use it to select the members to be stringified.

			if (rep && typeof rep === 'object') {
				length = rep.length;
				for (i = 0; i < length; i += 1) {
					k = rep[i];
					if (typeof k === 'string') {
						v = str(k, value);
						if (v) {
							partial.push(quote(k) + (gap ? ': ' : ':') + v);
						}
					}
				}
			} else {

// Otherwise, iterate through all of the keys in the object.

				for (k in value) {
					if (Object.hasOwnProperty.call(value, k)) {
						v = str(k, value);
						if (v) {
							partial.push(quote(k) + (gap ? ': ' : ':') + v);
						}
					}
				}
			}

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

			v = partial.length === 0 ? '{}' :
				gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
						mind + '}' : '{' + partial.join(',') + '}';
			gap = mind;
			return v;
		}
	}

// If the JSON object does not yet have a stringify method, give it one.

	if (typeof JSON.stringify !== 'function') {
		JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

			var i;
			gap = '';
			indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

			if (typeof space === 'number') {
				for (i = 0; i < space; i += 1) {
					indent += ' ';
				}

// If the space parameter is a string, it will be used as the indent string.

			} else if (typeof space === 'string') {
				indent = space;
			}

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

			rep = replacer;
			if (replacer && typeof replacer !== 'function' &&
					(typeof replacer !== 'object' ||
					 typeof replacer.length !== 'number')) {
				throw new Error('JSON.stringify');
			}

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

			return str('', {'': value});
		};
	}


// If the JSON object does not yet have a parse method, give it one.

	if (typeof JSON.parse !== 'function') {
		JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

			var j;

			function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

				var k, v, value = holder[key];
				if (value && typeof value === 'object') {
					for (k in value) {
						if (Object.hasOwnProperty.call(value, k)) {
							v = walk(value, k);
							if (v !== undefined) {
								value[k] = v;
							} else {
								delete value[k];
							}
						}
					}
				}
				return reviver.call(holder, key, value);
			}


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

			cx.lastIndex = 0;
			if (cx.test(text)) {
				text = text.replace(cx, function (a) {
					return '\\u' +
						('0000' + a.charCodeAt(0).toString(16)).slice(-4);
				});
			}

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

			if (/^[\],:{}\s]*$/.
test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

				j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

				return typeof reviver === 'function' ?
					walk({'': j}, '') : j;
			}

// If the text is not JSON parseable, then a SyntaxError is thrown.

			throw new SyntaxError('JSON.parse');
		};
	}
}());

