jsio('import std.uri as uri'); 
jsio('import std.base64 as base64');
jsio('from util.browserdetect import BrowserDetect');

;(function() {
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

	exports.XHR = function() {
		var win = window,
			doc = exports.getDoc();
		//if (doc.parentWindow) { win = doc.parentWindow; }
		
		return new (exports.XHR = win.XMLHttpRequest ? win.XMLHttpRequest
			: function() { return win.ActiveXObject && new win.ActiveXObject('Msxml2.XMLHTTP') || null; });
	}
	
	exports.createXHR = function() { return new exports.XHR(); }

})();

function isLocalFile(url) { return /^file:\/\//.test(url); }
function isWindowDomain(url) { return uri.isSameDomain(url, window.location.href); }

var xhrSupportsBinary = undefined;
function checkXHRBinarySupport(xhr) {
	xhrSupportsBinary = !!xhr.sendAsBinary;
}

function canUseXHR(url) {
	// always use jsonp for local files
	if (isLocalFile(url)) { return false; }
	
	// try to create an XHR using the same function the XHR transport uses
	var xhr = new exports.XHR();
	if (!xhr) { return false; }
	
	checkXHRBinarySupport(xhr);
	
	// if the URL requested is the same domain as the window,
	// then we can use same-domain XHRs
	if (isWindowDomain(url)) { return true; }
	
	// if the URL requested is a different domain than the window,
	// then we need to check for cross-domain support
	if (window.XMLHttpRequest
			&& (xhr.__proto__ == XMLHttpRequest.prototype // WebKit Bug 25205
				|| xhr instanceof window.XMLHttpRequest)
			&& xhr.withCredentials !== undefined
		|| window.XDomainRequest 
			&& xhr instanceof window.XDomainRequest) {
		return true;
	}
};

var transports = exports.transports = {};

exports.chooseTransport = function(url, options) {
	switch(options.preferredTransport) {
		case 'jsonp':
			return transports.jsonp;
		case 'xhr':
		default:
			if (canUseXHR(url)) { return transports.xhr; };
			return transports.jsonp;
	}
};

// TODO: would be nice to use these somewhere...

var PARAMS = {
	'xhrstream':   {"is": "1", "bs": "\n"},
	'xhrpoll':     {"du": "0"},
	'xhrlongpoll': {},
	'sselongpoll': {"bp": "data: ", "bs": "\r\n", "se": "1"},
	'ssestream':   {"bp": "data: ", "bs": "\r\n", "se": "1", "is": "1"}
};

exports.Transport = Class(function(supr) {
	this.handshake = function(url, options) {
		throw new Error("handshake Not Implemented"); 
	};
	this.comet = function(url, sessionKey, lastEventId, options) { 
		throw new Error("comet Not Implemented"); 
	};
	this.send = function(url, sessionKey, data, options) { 
		throw new Error("send Not Implemented");
	};
	this.encodePacket = function(packetId, data, options) { 
		throw new Error("encodePacket Not Implemented"); 
	};
	this.abort = function() { 
		throw new Error("abort Not Implemented"); 
	};
});

var baseTransport = Class(exports.Transport, function(supr) {
	this.init = function() {
		this._aborted = false;
		this._handshakeArgs = {ct:'application/javascript'};
		this._handshakeData = '{}'
	};
	
	this.handshake = function(url, options) {
		logger.debug('handshake:', url, options);
		this._makeRequest('send', url + '/handshake', 
						  this._handshakeArgs,
						  this._handshakeData,
						  this.handshakeSuccess, 
						  this.handshakeFailure);
	};
	
	this.comet = function(url, sessionKey, lastEventId, options) {
		logger.debug('comet:', url, sessionKey, lastEventId, options);
		var args = {
			s: sessionKey,
			a: lastEventId
		};
		this._makeRequest('comet', url + '/comet', 
						  args,
						  null,
						  this.cometSuccess, 
						  this.cometFailure);
	};
	
	this.send = function(url, sessionKey, lastEventId, data, options) {
		//logger.debug('send:', url, sessionKey, data, options);
		var args = {
			s: sessionKey,
			a: lastEventId
		};
		this._makeRequest('send', url + '/send', 
						  args,
						  data,
						  this.sendSuccess, 
						  this.sendFailure);
	};
});

transports.xhr = Class(baseTransport, function(supr) {
	
	this.init = function() {
		supr(this, 'init');
	
		this._xhr = {
			'send': new exports.XHR(),
			'comet': new exports.XHR()
		};
	};

	this.abort = function() {
		this._aborted = true;
		for(var i in this._xhr) {
			if(this._xhr.hasOwnProperty(i)) {
				this._abortXHR(i);
			}
		}
	};
	
	this._abortXHR = function(type) {
		logger.debug('aborting XHR');

		var xhr = this._xhr[type];
		try {
			if('onload' in xhr) {
				xhr.onload = xhr.onerror = xhr.ontimeout = null;
			} else if('onreadystatechange' in xhr) {
				xhr.onreadystatechange = null;
			}
			if(xhr.abort) { xhr.abort(); }
		} catch(e) {
			logger.debug('error aborting xhr', e);
		}
		
		// do not reuse aborted XHRs
		this._xhr[type] = new exports.XHR();
	};
	
	this.encodePacket = function(packetId, data, options) {
		// we don't need to base64 encode things unless there's a null character in there
		return !xhrSupportsBinary ? [ packetId, 1, base64.encode(data) ] : [ packetId, 0, data ];
	};

	function onReadyStateChange(xhr, rType, cb, eb) {
		try {
			var data = {status: xhr.status};
		} catch(e) { eb({response: 'Could not access status'}); }
		
		try {
			if(xhr.readyState != 4) { return; }
			
			data.response = eval(xhr.responseText);
			if(data.status != 200) { 
				logger.debug('XHR failed with status ', xhr.status);
				eb(data);
				return;
			}
			
			logger.debug('XHR data received');
		} catch(e) {
			logger.debug('Error in XHR::onReadyStateChange', e);
			eb(data);
			this._abortXHR(rType);
			logger.debug('done handling XHR error');
			return;
		}
		
		cb(data);
	};

	/**
	 * even though we encode the POST body as in application/x-www-form-urlencoded
	 */
	this._makeRequest = function(rType, url, args, data, cb, eb) {
		if (this._aborted) { return; }
		var xhr = this._xhr[rType];
		xhr.open('POST', url + '?' + uri.buildQuery(args)); // must open XHR first
		xhr.setRequestHeader('Content-Type', 'text/plain'); // avoid preflighting
		if('onload' in xhr) {
			xhr.onload = bind(this, onReadyStateChange, xhr, rType, cb, eb);
			xhr.onerror = xhr.ontimeout = eb;
		} else if('onreadystatechange' in xhr) {
			xhr.onreadystatechange = bind(this, onReadyStateChange, xhr, rType, cb, eb);
		}
		// NOTE WELL: Firefox (and probably everyone else) likes to encode our nice
		//						binary strings as utf8. Don't let them! Say no to double utf8
		//						encoding. Once is good, twice isn't better.
		// if (xhrSupportsBinary) {
		// 		xhr.setRequestHeader('x-CSP-SendAsBinary', 'true');
		// }
		setTimeout(function() {
			xhr[xhrSupportsBinary ? 'sendAsBinary' : 'send'](data || null)
		}, 0);
	};
});

var EMPTY_FUNCTION = function() {},
	SLICE = Array.prototype.slice;

transports.jsonp = Class(baseTransport, function(supr) {
	var doc;
	
	var createIframe = function() {
		var doc = exports.getDoc();
		if (!doc.body) { return false; }
		
		var i = doc.createElement("iframe");
		with(i.style) { display = 'block'; width = height = border = margin = padding = '0'; overflow = visibility = 'hidden'; position = 'absolute'; top = left = '-999px'; }
		i.cbId = 0;
		doc.body.appendChild(i);
		i.src = 'about:blank';
		return i;
	};

	var cleanupIframe = function(ifr) {
		var win = ifr.contentWindow, doc = win.document;
		logger.debug('removing script tags');
		
		var scripts = doc.getElementsByTagName('script');
		for (var i = scripts.length - 1; i >= 0; --i) {
			doc.body.removeChild(scripts[i]);
		}
		
		logger.debug('deleting iframe callbacks');
		win['cb' + ifr.cbId] = win['eb' + ifr.cbId] = EMPTY_FUNCTION;
	};

	var removeIframe = function(ifr) {
		setTimeout(function() {
			if(ifr && ifr.parentNode) { ifr.parentNode.removeChild(ifr); }
		}, 60000);
	};

	this.init = function() {
		supr(this, 'init');

		this._onReady = [];
		this._isReady = false;

		this._createIframes();
	};

	this._createIframes = function() {
		this._ifr = {
			send: createIframe(),
			comet: createIframe()
		};
		
		if(this._ifr.send === false) { return setTimeout(bind(this, '_createIframes'), 100); }
		
		this._isReady = true;

		var readyArgs = this._onReady;
		this._onReady = [];
		for(var i = 0, args; args = readyArgs[i]; ++i) {
			this._makeRequest.apply(this, args);
		}
	};

	this.encodePacket = function(packetId, data, options) {
		return [ packetId, 1, base64.encode(data) ];
	};

	this.abort = function() {
		this._aborted = true;
		for(var i in this._ifr) {
			if(this._ifr.hasOwnProperty(i)) {
				var ifr = this._ifr[i];
				cleanupIframe(ifr);
				removeIframe(ifr);
			}
		}
	};
	
	this._makeRequest = function(rType, url, args, data, cb, eb) {
		if(!this._isReady) { return this._onReady.push(arguments); }
		
		var ifr = this._ifr[rType],
			id = ++ifr.cbId,
			req = {
				type: rType,
				id: id,
				cb: cb,
				eb: eb,
				cbName: 'cb' + id,
				ebName: 'eb' + id,
				completed: false
			};
		
		args.d = data;
		args.n = Math.random();	
		switch(rType) {
			case 'send': args.rs = ';'; args.rp = req.cbName; break;
			case 'comet': args.bs = ';'; args.bp = req.cbName; break;
		}
		
		req.url = url + '?' + uri.buildQuery(args)
		
		setTimeout(bind(this, '_request', req), 0);
	}
	
	this._request = function(req) {
		var ifr = this._ifr[req.type],
			win = ifr.contentWindow,
			doc = win.document,
			body = doc.body;
                /*added by skysbird for opera support*/
                if (!body){return setTimeout(bind(this,'_request',req),100); }
		win[req.ebName] = bind(this, checkForError, req);
		win[req.cbName] = bind(this, onSuccess, req);
		
		if(BrowserDetect.isWebKit) {
			// this will probably cause loading bars in Safari -- might want to rethink?
			doc.open();
			doc.write('<scr'+'ipt src="'+req.url+'"></scr'+'ipt><scr'+'ipt>'+ebName+'(false)</scr'+'ipt>');
			doc.close();
		} else {
			var s = doc.createElement('script');
			s.src = req.url;
			
			// IE
			if(s.onreadystatechange === null) { s.onreadystatechange = bind(this, onReadyStateChange, req, s); }
			body.appendChild(s);
			
			if(!BrowserDetect.isIE) {
				var s = doc.createElement('script');
				s.innerHTML = req.ebName+'(false)';
				body.appendChild(s);
			}
		}
		
		killLoadingBar();
	};
	
	function onSuccess(req, response) {
		logger.debug('successful: ', req.url, response);
		req.completed = true;
		
		logger.debug('calling the cb');
		req.cb.call(GLOBAL, {status: 200, response: response});
		logger.debug('cb called');
	}
	
	// IE6/7 onReadyStateChange
	function onReadyStateChange(req, scriptTag) {
		if (scriptTag && scriptTag.readyState != 'loaded') { return; }
		scriptTag.onreadystatechange = function() {};
		checkForError.call(this, req);
	}

	function checkForError(req, response) {
		cleanupIframe(this._ifr[req.type]);
		
		if (!req.completed) {
			var data = {
				status: response ? 200 : 404,
				response: response || 'Unable to load resouce'
			};
			
			logger.debug('error making request:', req.url, data);
			logger.debug('calling eb');
			req.eb.call(GLOBAL, data);
		}
	}
	
	var killLoadingBar = BrowserDetect.isFirefox || BrowserDetect.isOpera ? function() {
		var b = document.body;
		if (!b) { return; }
		
		if (!killLoadingBar.iframe) { killLoadingBar.iframe = document.createElement('iframe'); }
		b.insertBefore(killLoadingBar.iframe, b.firstChild);
		b.removeChild(killLoadingBar.iframe);
	} : function() {};
});
	
