// Based on json2.js (version 2009-09-29) http://www.JSON.org/json2.js
// exports createGlobal, stringify, parse, stringifyDate

/**
 * if a global JSON object doesn't exist, create one
 */
exports.createGlobal = function() {
	if(typeof JSON == 'undefined') { JSON = {}; }
	if(typeof JSON.stringify !== 'function') {
		JSON.stringify = exports.stringify;
	}
	if(typeof JSON.parse !== 'function') {
		JSON.parse = exports.parse;
	}
};

;(function() {
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
		// quote the string if it doesn't contain control characters, quote characters, and backslash characters
		// otherwise, replace those characters with safe escape sequences
		escapable.lastIndex = 0;
		return escapable.test(string)
			? '"' + string.replace(escapable, function (a) {
					var c = meta[a];
					return typeof c === 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
				}) + '"'
			: '"' + string + '"';
	}
	
	// Produce a string from holder[key].
	function str(key, holder) {
		var mind = gap, value = holder[key];
		
		// If the value has a toJSON method, call it to obtain a replacement value.
		if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
			value = value.toJSON(key);
		}
		
		// If we were called with a replacer function, then call the replacer to
		// obtain a replacement value.
		if (typeof rep === 'function') { value = rep.call(holder, key, value); }
		
		switch (typeof value) {
			case 'string':
				return quote(value);
			case 'number':
				// JSON numbers must be finite
				return isFinite(value) ? String(value) : 'null';
			case 'boolean':
				return String(value);
			case 'object': // object, array, date, null
				if (value === null) { return 'null'; } // typeof null == 'object'
				if (value.constructor === Date) { return exports.stringifyDate(value); }
			
				gap += indent;
				var partial = [];
				
				// Is the value an array?
				if (value.constructor === Array) {
					var length = value.length;
					for (var i = 0; i < length; i += 1) {
						partial[i] = str(i, value) || 'null';
					}
					
					// Join all of the elements together, separated with commas, and wrap them in brackets.
					var v = partial.length === 0 ? '[]' :
						gap ? '[\n' + gap +
								partial.join(',\n' + gap) + '\n' +
									mind + ']' :
							  '[' + partial.join(',') + ']';
					gap = mind;
					return v;
				}
				
				if (rep && typeof rep === 'object') { // rep is an array
					var length = rep.length;
					for (var i = 0; i < length; i += 1) {
						var k = rep[i];
						if (typeof k === 'string') {
							var v = str(k, value);
							if (v) {
								partial.push(quote(k) + (gap ? ': ' : ':') + v);
							}
						}
					}
				} else { // iterate through all of the keys in the object.
					for (var k in value) {
						if (Object.hasOwnProperty.call(value, k)) {
							var v = str(k, value);
							if (v) {
								partial.push(quote(k) + (gap ? ': ' : ':') + v);
							}
						}
					}
				}

				// Join all of the member texts together, separated with commas,
				// and wrap them in braces.
				var v = partial.length === 0 ? '{}' :
					gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
							mind + '}' : '{' + partial.join(',') + '}';
				gap = mind;
				return v;
		}
	}


	/**
	 * The stringify method takes a value and an optional replacer, and an optional
	 * space parameter, and returns a JSON text. The replacer can be a function
	 * that can replace values, or an array of strings that will select the keys.
 	 * A default replacer method can be provided. Use of the space parameter can
	 * produce text that is more easily readable.
	 */
	exports.stringify = function (value, replacer, space) {
		gap = '';
		indent = '';
		
		// If the space parameter is a number, make an indent string containing that many spaces.
		if (typeof space === 'number') {
			for (var i = 0; i < space; i += 1) {
				indent += ' ';
			}
		} else if (typeof space === 'string') {
			indent = space;
		}
		
		// If there is a replacer, it must be a function or an array.
		rep = replacer;
		if (replacer && typeof replacer !== 'function' &&
				(typeof replacer !== 'object' ||
				 typeof replacer.length !== 'number')) {
			throw new Error('JSON stringify: invalid replacer');
		}
		
		// Make a fake root object containing our value under the key of ''.
		// Return the result of stringifying the value.
		return str('', {'': value});
	};
	
	exports.stringifyDate = function(d) {
		var year = d.getUTCFullYear(),
			month = d.getUTCMonth() + 1,
			day = d.getUTCDate(),
			hours = d.getUTCHours(),
			minutes = d.getUTCMinutes(),
			seconds = d.getUTCSeconds(),
			ms = d.getUTCMilliseconds();
		
		if (month < 10) { month = '0' + month; }
		if (day < 10) { day = '0' + day; }
		if (hours < 10) { hours = '0' + hours; }
		if (minutes < 10) { minutes = '0' + minutes; }
		if (seconds < 10) { seconds = '0' + seconds; }
		if (ms < 10) { ms = '00' + ms; }
		else if (ms < 100) { ms = '0' + ms; }

		return '"' + year
			+ '-' + month
			+ '-' + day
			+ 'T' + hours
			+ ':' + minutes
			+ ':' + seconds
			+ '.' + ms
			+ 'Z"';
	}
	
	/**
	 * The parse method takes a text and an optional reviver function, and returns
	 * a JavaScript value if the text is a valid JSON text.
	 */
	exports.parse = function (text, reviver) {
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

		if (/^[\],:{}\s]*$/
				.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
				.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
				.replace(/(?:^|:|,)(?:\s*\[)+/g, '')))
		{
			var j = eval('(' + text + ')');
			if(!reviver) {
				return j;
			} else {
				// In the optional fourth stage, we recursively walk the new structure, passing
				// each name/value pair to a reviver function for possible transformation.
				var walk = function(holder, key) {
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
				return walk({'': j}, '');
			}
		}

		// If the text is not JSON parseable, then a SyntaxError is thrown.
		throw new SyntaxError('JSON.parse');
	};
}());