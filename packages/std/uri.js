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

exports.Uri = Class(function(supr) {
	this.init = function(url, isStrict) {
		var uriData = exports.parse(url, isStrict)
		for (attr in uriData) {
			this['_' + attr] = uriData[attr];
		};
	};
  
	for (var i = 0, attr; attr = attrs[i]; ++i) {
		(function(attr) {
			var fNameSuffix = attr.charAt(0).toUpperCase() + attr.slice(1);
			this['get' + fNameSuffix] = function() {
				return this['_' + attr];
			};
			this['set' + fNameSuffix] = function(val) {
				this['_' + attr] = val;
			};
		}).call(this, attr);
	};

	this.toString = this.render = function() {
		// XXX TODO: This is vaguely reasonable, but not complete. fix it...
		var a = this._protocol ? this._protocol + "://" : ""
		var b = this._host ? this._host + ((this._port || 80) == 80 ? "" : ":" + this._port) : "";
		var c = this._path;
		var d = this._query ? '?' + this._query : '';
		var e = this._anchor ? '#' + this._anchor : '';
		return a + b + c + d + e;
	};
});

exports.buildQuery = function(kvp) {
	var pairs = [];
	for (key in kvp) {
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
