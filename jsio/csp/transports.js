jsio('import Class, bind');
jsio('import jsio.std.uri as uri'); 
jsio('import jsio.std.base64 as base64');
jsio('import jsio.logging');
jsio('import .errors');
jsio('from jsio.util.browserdetect import BrowserDetect');
jsio('import jsio.util.url as urlUtil');

var logger = jsio.logging.getLogger("csp.transports");
exports.allTransports = {}

exports.registerTransport = function(name, transport) {
	logger.debug('registering transport', name);
	if (name in exports.allTransports) {
		throw new Error("Transport " + name + " already exists");
	}
	exports.allTransports[name] = transport;
}

exports.chooseTransport = function(url, options) {
	// NOTE: override just for testing.
	return exports.allTransports.jsonp;
	
	var test = location.toString().match('file://');
	if (test && test.index === 0) {
		logger.debug('Detected Local file, choosing transport jsonp')
		return exports.allTransports.jsonp // XXX
	}
	if (uri.isSameDomain(url, location.toString())) {
		logger.debug('Detected same domain, chosing transport xhr');
		return exports.allTransports.xhr;
	}
	try {
		if (window.XMLHttpRequest && (new XMLHttpRequest()).withCredentials !== undefined) {
			logger.debug('Detected cross-domain; detected xdomain xhr capabilities; choosing transport xhr');
			return exports.allTransports.xhr;
	}
	} catch(e) { }
	logger.debug('Detected cross-domain; no xdomain xhr capabilities present; choosing transport jsonp');
	return exports.allTransports.jsonp

}

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
	}
	
	this.comet = function(url, sessionKey, lastEventId, options) {
		throw new Error("comet Not Implemented");
	}
	
	this.send = function(url, sessionKey, data, options) {
		throw new Error("send Not Implemented");
	}
	
	this.encodePacket = function(packetId, data, options) {
		throw new Error("encodePacket Not Implemented");
	}
	
	this.abort = function() {
		throw new Error("abort Not Implemented");
	}
	
})

exports.registerTransport('xhr', Class(exports.Transport, function(supr) {
	// TODO: implement...

}));


exports.registerTransport('jsonp', Class(exports.Transport, function(supr) {

	var logger = jsio.logging.getLogger('csp.transports.jsonp');
	function createIframe() {
		var i = document.createElement("iframe");
		with(i.style) { display = 'block'; width = height = border = margin = padding = '0'; overflow = visibility = 'hidden'; }
		i.cbId = 0;
		i.src = 'javascript:document.open();document.write("<html><body></body></html>")';
		document.body.appendChild(i);
		return i;
	}

	this.init = function() {
		this._ifr = {
			'send':  createIframe(),
			'comet': createIframe()
		};
	}
	this.handshake = function(url, options) {
		logger.debug('handshake:', url, options);
		args = {
			d:'{}',
			ct:'application/javascript'
		}
		this._makeRequest('send', url + '/handshake', args, this.handshakeSuccess, this.handshakeFailure);
	}
	
	this.comet = function(url, sessionKey, lastEventId, options) {
		logger.debug('comet:', url, sessionKey, lastEventId, options);
		args = {
			s: sessionKey,
			a: lastEventId
		}
		this._makeRequest('comet', url + '/comet', args, this.cometSuccess, this.cometFailure);
	}
	
	this.send = function(url, sessionKey, data, options) {
		logger.debug('send:', url, sessionKey, data, options);
		args = {
			d: data,
			s: sessionKey
		}
		this._makeRequest('send', url + '/send', args, this.sendSuccess, this.sendFailure);
	}
	
	this.encodePacket = function(packetId, data, options) {
		return [ packetId, 1, base64.encode(data) ]
	}
	
	this._makeRequest = function(rType, url, args, cb, eb) {
		args.n = Math.random();
		window.setTimeout(bind(this, function() {
			var ifr = this._ifr[rType];
			// IE6+ uses contentWindow.document, the others use temp.contentDocument.
			var win = ifr.contentWindow;
			var doc = win.document;
			var body = doc.body;
			var completed = false;
			var jsonpId = ifr.cbId++;
			var onFinish = win['eb' + jsonpId] = function(scriptTag) {
				// IE6 onReadyStateChange
				if(scriptTag && scriptTag.readyState != 'loaded') { return; }
				logger.debug('in onFinish');
				if (!completed) { logger.debug('error making request:', fullUrl); }

				logger.debug('removing scripts');
				var scripts = doc.getElementsByTagName('script');
				var s1 = doc.getElementsByTagName('script')[0];
				var s2 = doc.getElementsByTagName('script')[1];
				if(s1) s1.parentNode.removeChild(s1);
				if(s2) s2.parentNode.removeChild(s2);
				logger.debug('removed scripts');

				logger.debug('deleting callbacks');
				win['cb' + jsonpId] = function(){};
				win['eb' + jsonpId] = function(){};
				
				if (!completed) {
					logger.debug('calling eb');
					eb.apply(null, arguments);
				}
			}

			win['cb' + jsonpId] = function callback() {
				logger.debug('successful: ', fullUrl,[].slice.call(arguments, 0));
				completed = true;
				logger.debug('calling the cb');
				cb.apply(null, arguments);
				logger.debug('cb called');
			}

			switch(rType) {
				case 'send': args.rs = ';'; args.rp = 'cb' + jsonpId; break;
				case 'comet': args.bs = ';'; args.bp = 'cb' + jsonpId; break;
			}
			var fullUrl = url + '?' + urlUtil.buildQuery(args);
			
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
	}
	
	function killLoadingBar() {
	
	}
	
}));

