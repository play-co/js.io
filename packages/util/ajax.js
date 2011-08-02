"use import";

import std.uri as URI;

var doc;
exports.getDoc = function() {
	if (doc) { return doc; }
	try {
		doc = window.ActiveXObject && new ActiveXObject('htmlfile');
		if (doc) {
			doc.open().write('<html></html>');
			doc.close();
			window.attachEvent('onunload', function() {
				try { doc.body.innerHTML = ''; } catch(e) {}
				doc = null;
			});
		}
	} catch(e) {}
	
	if (!doc) { doc = document; }
	return doc;
};

var ctor = function() {
	var win = window,
		doc = exports.getDoc();
	//if (doc.parentWindow) { win = doc.parentWindow; }
	
	return new (ctor = win.XMLHttpRequest ? win.XMLHttpRequest
		: function() { return win.ActiveXObject && new win.ActiveXObject('Msxml2.XMLHTTP') || null; });
};

exports.createXHR = function() { return new ctor(); }

exports.post = function(opts, cb) {
	return exports.get(merge({method: 'POST'}, opts), cb);
}

exports.get = function(opts, cb) {
	if (typeof opts == 'string') { opts = {url: opts}; }
	var method = opts.method || 'GET';
	var url = opts.url;
	var isObject = opts.data && typeof opts.data == 'object';
	if (!opts.url) { logger.error('no url provided'); return; }
	
	var data = method == 'POST' ? isObject ? JSON.stringify(opts.data) : opts.data : null;
	if (method == 'GET' && opts.data) {
		url = new URI(url).addQuery(isObject ? opts.data : URI.parseQuery(opts.data)).toString();
	}
	
	var xhr = exports.createXHR();
	xhr.open(method, url, !(opts.async == false));
	xhr.setRequestHeader('Content-Type', 'text/plain');
	xhr.onreadystatechange = bind(this, onReadyStateChange, xhr, opts.type, cb);
	xhr.send(data || null);
}

function onReadyStateChange(xhr, type, cb) {
	if (xhr.readyState != 4) { return; }
	// .status will be 0 when requests are filled via app cache on at least iOS 4.x
	if (xhr.status != 200 && xhr.status != 0) {
		cb(xhr.response, null);
	} else {
		var data = xhr.responseText;
		if (type == 'json') {
			data = JSON.parse(data);
		}
		cb(null, data);
	}
}
