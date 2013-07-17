import std.uri as URI;

var SIMULTANEOUS = 4;
var _inflight = 0;

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

var Request = Class(function() {
	var _UID = 0;
	
	this.init = function(opts, cb) {
		if (!opts || !opts.url) { logger.error('no url provided'); return; }
		
		this.method = (opts.method || 'GET').toUpperCase();
		this.url = opts.url;
		this.type = opts.type;
		this.async = opts.async;
		this.timeout = opts.timeout;
		this.id = ++_UID;
		this.headers = {};
		this.cb = cb;
		
		if (opts.headers) {
			for (var key in opts.headers) if (opts.headers.hasOwnProperty(key)) {
				var value = opts.headers[key];
				this.headers[key] = value;
			}
		}
		
		var isObject = opts.data && typeof opts.data == 'object';
		
		if (this.method == 'GET' && opts.data) {
			this.url = new URI(this.url)
							.addQuery(isObject ? opts.data : URI.parseQuery(opts.data))
							.toString();
		}

		if (opts.query) {
			this.url = new URI(this.url)
							.addQuery(typeof opts.query == 'object' ? opts.query : URI.parseQuery(opts.query))
							.toString();
		}
		
		try {
			this.data = (this.method != 'GET' ? (isObject ? JSON.stringify(opts.data) : opts.data) : null);
			if (isObject && !this.headers['Content-Type']) {
				this.headers['Content-Type'] = 'application/json';
			}
		} catch(e) {
			cb && cb({invalidData: true}, null, '');
			return;
		}
	}
});

var _pending = [];

exports.get = function(opts, cb) {
	var request = new Request(opts, cb);
	
	if (_inflight >= SIMULTANEOUS) {
		_pending.push(request);
	} else {
		_send(request);
	}
}

function _sendNext() {
	//logger.log('====INFLIGHT', _inflight, SIMULTANEOUS, 'might send next?');
	if (_inflight < SIMULTANEOUS) {
		var request = _pending.shift();
		if (request) {
			_send(request);
		}
	}
}

function _send(request) {
	++_inflight;
	//logger.log('====INFLIGHT', _inflight, 'sending request', request.id);
	
	var xhr = exports.createXHR();
	xhr.open(request.method, request.url, !(request.async == false));
	var setContentType = false;
	for (var key in request.headers) {
		if (key.toLowerCase() == 'content-type') { setContentType = true; }
		xhr.setRequestHeader(key, request.headers[key]);
	}

	if (!setContentType) {
		xhr.setRequestHeader('Content-Type', 'text/plain');
	}
	
	xhr.onreadystatechange = bind(this, onReadyStateChange, request, xhr);
	if (request.timeout) {
		request.timeoutRef = setTimeout(bind(this, cancel, xhr, request), request.timeout);
		//logger.log('==== setting timeout for', request.timeout, request.timeoutRef, '<<');
	}
	
	request.ts = +new Date();
	xhr.send(request.data || null);
}

function cancel(xhr, request) {
	--_inflight;
	// logger.log('====INFLIGHT', _inflight, 'timeout (cancelled)', request.id);
	if (request.timedOut) {
		logger.log('already timed out?!');
	}
	
	xhr.onreadystatechange = null;
	request.timedOut = true;
	if (xhr.readyState >= xhr.HEADERS_RECEIVED) {
		try {
			var headers = xhr.getAllResponseHeaders();
		} catch (e) {}
	}
	
	request.cb && request.cb({timeout: true}, null, headers);
}

function onReadyStateChange(request, xhr) {
	if (xhr.readyState != 4) { return; }
	
	if (request.timedOut) { throw 'Unexpected?!'; }
	
	--_inflight;
	
	// logger.log('====INFLIGHT', _inflight, 'received response', request.ts, request.id, (+new Date() - request.ts) / 1000);
	setTimeout(_sendNext, 0);
	
	var cb = request.cb;
	if ('timeoutRef' in request) {
		// logger.log('==== AJAX CLEARING TIMEOUT', request.id);
		clearTimeout(request.timeoutRef);
		request.timeoutRef = null;
	}
	
	// only fire callback once
	if (!cb || request.handled) { return; }
	request.handled = true;
	
	// .status will be 0 when requests are filled via app cache on at least iOS 4.x
	if (xhr.status != 200 && xhr.status != 0) {
		var response = xhr.response;
		if (xhr.getResponseHeader('Content-Type') == 'application/json') {
			try {
				response = JSON.parse(response);
			} catch(e) {
			}
		}
		cb({status: xhr.status, response: response}, null, xhr.getAllResponseHeaders());
	} else {
		var data = xhr.responseText;
		if (request.type == 'json') {
			if (!data) {
				cb({status: xhr.status, response: xhr.response}, null, xhr.getAllResponseHeaders());
				return;
			} else {
				try {
					data = JSON.parse(data);
				} catch(e) {
					cb({status: xhr.status, response: xhr.response, parseError: true}, null, xhr.getAllResponseHeaders());
					return;
				}
			}
		}
		cb(null, data, xhr.getAllResponseHeaders());
	}
}
