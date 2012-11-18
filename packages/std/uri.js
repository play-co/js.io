var attrs = [ 
	"source",
	"protocol",
	"authority",
	"userInfo",
	"user",
	"password",
	"host",
	"port",
	"relative",
	"path",
	"directory",
	"file",
	"query",
	"anchor"
];

var URI = exports = Class(function(supr) {
	this.init = function(url, isStrict) {
		if (url instanceof URI) {
			for (var i = 0, attr; attr = attrs[i]; ++i) {
				this['_' + attr] = url['_' + attr];
			}
			return;
		}
		
		this._isStrict = isStrict;
		
		var uriData = exports.parse(url, isStrict);
		for (var attr in uriData) {
			this['_' + attr] = uriData[attr];
		};
	}
  
	for (var i = 0, attr; attr = attrs[i]; ++i) {
		(function(attr) {
			var fNameSuffix = attr.charAt(0).toUpperCase() + attr.slice(1);
			this['get' + fNameSuffix] = function() {
				return this['_' + attr];
			};
			this['set' + fNameSuffix] = function(val) {
				this['_' + attr] = val;
				return this;
			};
		}).call(this, attr);
	};
	
	this.query = function(key) { return exports.parseQuery(this._query)[key]; }
	this.hash = function(key) { return exports.parseQuery(this._anchor)[key]; }
	
	this.addHash = function(kvp) {
		var hash = exports.parseQuery(this._anchor);
		for (var i in kvp) { hash[i] = kvp[i]; }
		this._anchor = exports.buildQuery(hash);
		return this;
	}
	
	this.push = function(path) {
		if (path) {
			this._path = (this._path + '/' + path).replace(/\/\/+/g, '/');
		}
		return this;
	}
	
	this.addQuery = function(kvp) {
		var query = exports.parseQuery(this._query);
		for (var i in kvp) { query[i] = kvp[i]; }
		this._query = exports.buildQuery(query);
		return this;
	}
	
	this.removeQuery = function(keys) {
		var query = exports.parseQuery(this._query);
		if (isArray(keys)) {
			for (var i = 0, n = keys.length; i < n; ++i) {
				delete query[keys[i]];
			}
		} else {
			delete query[keys];
		}
		this._query = exports.buildQuery(query);
		return this;
	}

	this.toJSON = function() { return this.toString(false); }

	this.toString = function(onlyBase) {
		// XXX TODO: This is vaguely reasonable, but not complete. fix it...
		var a = this._protocol ? this._protocol + "://" : ""
		var b = this._host ? this._host + ((this._port || 80) == 80 ? "" : ":" + this._port) : "";
		
		if (onlyBase) {
			return a + b;
		}
		
		var c = this._path;
		var d = this._query ? '?' + this._query : '';
		var e = this._anchor ? '#' + this._anchor : '';
		return a + b + c + d + e;
	};
});

exports.relativeTo = function(url, base) {
	var url = String(url);
	if (base && !/^http(s?):\/\//.test(url)) {
		var baseURI = new exports(base)
			.setAnchor('')
			.setQuery('')
			.setFile('')
			.toString(url.charAt(0) == '/');

		url = exports.resolveRelative(baseURI + url);
	}

	return new URI(url);
}

exports.resolveRelative = function(url) {
	var prevUrl;
	
	// remove ../ with preceeding folder
	while((prevUrl = url) != (url = url.replace(/(^|\/)([^\/]+)\/\.\.\//g, '/'))) {};
	
	// remove ./ if it isn't preceeded by a .
	return url.replace(/[^.]\.\//g, '');
}

exports.buildQuery = function(kvp) {
	var pairs = [];
	for (var key in kvp) {
		pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(kvp[key]));
	}
	return pairs.join('&');
}

exports.parseQuery = function(str) {
	var pairs = str.split('&'),
		n = pairs.length,
		data = {};
	for (var i = 0; i < n; ++i) {
		var pair = pairs[i].split('='),
			key = decodeURIComponent(pair[0]);
		if (key) { data[key] = decodeURIComponent(pair[1]); }
	}
	return data;
}

// Regexs are based on parseUri 1.2.2
// Original: (c) Steven Levithan <stevenlevithan.com>
// Original: MIT License

var strictRegex = /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/;
var looseRegex = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
var queryStringRegex = /(?:^|&)([^&=]*)=?([^&]*)/g;

exports.parse = function(str, isStrict) {
	var regex = isStrict ? strictRegex : looseRegex;
	var result = {};
	var match = regex.exec(str);
	for (var i = 0, attr; attr = attrs[i]; ++i) {
		result[attr] = match[i] || "";
	}
	
	var qs = result['queryKey'] = {};
	result['query'].replace(queryStringRegex, function(check, key, val) {
		if (check) {
			qs[key] = val;
		}
	});
	
	return result;
}

exports.isSameDomain = function(urlA, urlB) {
	var a = exports.parse(urlA);
	var b = exports.parse(urlB);
	return ((a.port == b.port ) && (a.host == b.host) && (a.protocol == b.protocol));
};
