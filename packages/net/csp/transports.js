jsio('from base import *');
jsio('import std.uri as uri'); 
jsio('import std.base64 as base64');
jsio('import .errors');
jsio('from util.browserdetect import BrowserDetect');

var createXHR = exports.createXHR = function() {
	return window.XMLHttpRequest ? new XMLHttpRequest()
		: window.XDomainRequest ? new XDomainRequest()
		: window.ActiveXObject ? new ActiveXObject("Msxml2.XMLHTTP")
		: null;
};

function isLocalFile(url) { return /^file:\/\//.test(url); }
function isWindowDomain(url) { return uri.isSameDomain(url, window.location.href); }

function canUseXHR(url) {
	// always use jsonp for local files
	if (isLocalFile(url)) { return false; }
	
	// try to create an XHR using the same function the XHR transport uses
	var xhr = createXHR();
	if (!xhr) { return false; }
	
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
		this._handshakeArgs = {
			d:'{}',
			ct:'application/javascript'
		};
	};
	
	this.handshake = function(url, options) {
		logger.debug('handshake:', url, options);
		this._makeRequest('send', url + '/handshake', 
						  this._handshakeArgs, 
						  this.handshakeSuccess, 
						  this.handshakeFailure);
	};
	
	this.comet = function(url, sessionKey, lastEventId, options) {
		logger.debug('comet:', url, sessionKey, lastEventId, options);
		args = {
			s: sessionKey,
			a: lastEventId
		};
		this._makeRequest('comet', url + '/comet', 
						  args, 
						  this.cometSuccess, 
						  this.cometFailure);
	};
	
	this.send = function(url, sessionKey, data, options) {
		logger.debug('send:', url, sessionKey, data, options);
		args = {
			d: data,
			s: sessionKey
		};
		this._makeRequest('send', url + '/send', 
						  args, 
						  this.sendSuccess, 
						  this.sendFailure);
	};
});

transports.xhr = Class(baseTransport, function(supr) {
	var abortXHR = function(xhr) {
		logger.debug('aborting XHR');
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
	};

	this.init = function() {
		supr(this, 'init');
	
		this._xhr = {
			'send': createXHR(),
			'comet': createXHR()
		};
	};

	this.abort = function() {
		for(var i in this._xhr) {
			if(this._xhr.hasOwnProperty(i)) {
				abortXHR(this._xhr[i]);
			}
		}
	};

	this.encodePacket = function(packetId, data, options) {
		// we don't need to base64 encode things unless there's a null character in there
		return data.indexOf('\0') == -1 ? [ packetId, 0, data ] : [ packetId, 1, base64.encode(data) ];
	};

	this._onReadyStateChange = function(rType, cb, eb) {
		try {
			var xhr = this._xhr[rType];
			if(xhr.readyState != 4) { return; }
			if(xhr.status != 200) { 
				logger.debug('XHR failed with status ', xhr.status);
				eb();
				return;
			}
		
			logger.debug('XHR data received');
			cb(eval(xhr.responseText));
		} catch(e) {
			var xhr = this._xhr[rType];
			logger.debug('Error in XHR::onReadyStateChange', e);
			eb();
			abortXHR(xhr);
			logger.debug('done handling XHR error');
		}
	};

	/**
	 * even though we encode the POST body as in application/x-www-form-urlencoded
	 */
	this._makeRequest = function(rType, url, args, cb, eb) {
		var xhr = this._xhr[rType], data = args.d || null;
		if('d' in args) { delete args.d; }
		xhr.open('POST', url + '?' + uri.buildQuery(args)); // must open XHR first
		xhr.setRequestHeader('Content-Type', 'text/plain'); // avoid preflighting
		if('onload' in xhr) {
			xhr.onload = bind(this, '_onReadyStateChange', rType, cb, eb);
			xhr.onerror = xhr.ontimeout = eb;
		} else if('onreadystatechange' in xhr) {
			xhr.onreadystatechange = bind(this, '_onReadyStateChange', rType, cb, eb);
		}
		if(data) {
			xhr.send(data);
		} else {
			xhr.send();
		}
	};
});

transports.jsonp = Class(baseTransport, function(supr) {
	var createIframe = function() {
		var i = document.createElement("iframe");
		with(i.style) { display = 'block'; width = height = border = margin = padding = '0'; overflow = visibility = 'hidden'; }
		i.cbId = 0;
		i.src = 'javascript:document.open();document.write("<html><body></body></html>")';
		document.body.appendChild(i);
		return i;
	};

	var abortIframe = function(ifr) {
		var win = ifr.contentWindow, doc = win.document;
		logger.debug('removing script tags');
		var scripts = doc.getElementsByTagName('script');
		var s1 = doc.getElementsByTagName('script')[0];
		var s2 = doc.getElementsByTagName('script')[1];
		if(s1) s1.parentNode.removeChild(s1);
		if(s2) s2.parentNode.removeChild(s2);

		logger.debug('deleting iframe callbacks');
		win['cb' + (ifr.cbId - 1)] = function(){};
		win['eb' + (ifr.cbId - 1)] = function(){};
	};

	var removeIframe = function(ifr) {
		$setTimeout(function() {
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
		if(!document.body) { return $setTimeout(bind(this, '_createIframes'), 100); }
		
		this._isReady = true;
		this._ifr = {
			'send':	 createIframe(),
			'comet': createIframe()
		};

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
		for(var i in this._ifr) {
			if(this._ifr.hasOwnProperty(i)) {
				var ifr = this._ifr[i];
				abortIframe(ifr);
				removeIframe(ifr);
			}
		}
	};

	this._makeRequest = function(rType, url, args, cb, eb) {
		if(!this._isReady) { return this._onReady.push(arguments); }

		args.n = Math.random();
		$setTimeout(bind(this, function() {
			var ifr = this._ifr[rType];
			// IE6+ uses contentWindow.document, the others use temp.contentDocument.
			var win = ifr.contentWindow, doc = win.document, body = doc.body;
			var completed = false;
			var jsonpId = ifr.cbId++;
			var onFinish = win['eb' + jsonpId] = function(scriptTag) {
				// IE6 onReadyStateChange
				if(scriptTag && scriptTag.readyState != 'loaded') { return; }
				if (!completed) { logger.debug('error making request:', fullUrl); }

				abortIframe(ifr);

				if (!completed) {
					logger.debug('calling eb');
					eb.apply(null, arguments);
				}
			};

			win['cb' + jsonpId] = function callback() {
				logger.debug('successful: ', fullUrl, [].slice.call(arguments, 0));
				completed = true;
				logger.debug('calling the cb');
				cb.apply(null, arguments);
				logger.debug('cb called');
			};

			switch(rType) {
				case 'send': args.rs = ';'; args.rp = 'cb' + jsonpId; break;
				case 'comet': args.bs = ';'; args.bp = 'cb' + jsonpId; break;
			}

			var fullUrl = url + '?' + uri.buildQuery(args);

			if(BrowserDetect.isWebKit) {
				doc.open();
				doc.write('<scr'+'ipt src="'+fullUrl+'"></scr'+'ipt>');
				doc.write('<scr'+'ipt>eb'+jsonpId+'(false)</scr'+'ipt>');
			} else {
				var s = doc.createElement('script');
				s.src = fullUrl;
				if(s.onreadystatechange === null) { s.onreadystatechange = bind(window, onFinish, s); } // IE
				body.appendChild(s);
				if(!BrowserDetect.isIE) {
					var s = doc.createElement('script');
					s.innerHTML = 'eb'+jsonpId+'(false)';
					body.appendChild(s);
				}
			}
			
			killLoadingBar();
		}), 0);
	};

	var killLoadingBar = BrowserDetect.isFirefox ? function() {
		if(!killLoadingBar.iframe) { killLoadingBar.iframe = document.createElement('iframe'); }
		if(document.body) {
			document.body.insertBefore(killLoadingBar.iframe, document.body.firstChild);
			document.body.removeChild(killLoadingBar.iframe); 
		}
	} : function() {};
});
	