;(function(global) {

var BACKOFF = 50;

var log = function() {
	if(typeof console != 'undefined' && console.log) {
		console.log.apply(console, arguments);
	}
}

if (!global.csp) {
    // For jsonp callbacks
    global.csp = {}
}
var csp = this;
if (typeof(require) != 'undefined' && require.__jsio) {
    require('..base64');
    require('..utf8')
}
var id = 0;
csp.readyState = {
    'initial': 0,
    'opening': 1,
    'open':    2,
    'closing': 3,
    'closed':  4
};
csp.util = {};
log('csp is', csp);
// Add useful url parsing library to socket.util
(function() {
// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License
function parseUri (str) {
    var o   = parseUri.options,
        m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
        uri = {},
        i   = 14;
    while (i--) uri[o.key[i]] = m[i] || "";
    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = $2;
    });
    return uri;
};
parseUri.options = {
    strictMode: false,
    key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    q:   {
        name:   "queryKey",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
};
csp.util.parseUri = parseUri;
})();

csp.util.isSameDomain = function(urlA, urlB) {
    var a = csp.util.parseUri(urlA);
    var b = csp.util.parseUri(urlB);
    return ((urlA.port == urlB.port ) && (urlA.host == urlB.host) && (urlA.protocol = urlB.protocol))
}

csp.util.chooseTransport = function(url, options) {
//    log(location.toString())
    var test = location.toString().match('file://');
    if (test && test.index === 0) {
//      log('local file, use jsonp')
      return transports.jsonp // XXX
    }
//    log('choosing');
    if (csp.util.isSameDomain(url, location.toString())) {
//        log('same domain, xhr');
        return transports.xhr;
    }
//    log('not xhr');
    try {
        if (window.XMLHttpRequest && (new XMLHttpRequest()).withCredentials !== undefined) {
//            log('xhr')
            return transports.xhr;
        }
    } catch(e) { }
//    log('jsonp');
    return transports.jsonp
}


var PARAMS = {
    'xhrstream':   {"is": "1", "bs": "\n"},
    'xhrpoll':     {"du": "0"},
    'xhrlongpoll': {},
    'sselongpoll': {"bp": "data: ", "bs": "\r\n", "se": "1"},
    'ssestream':   {"bp": "data: ", "bs": "\r\n", "se": "1", "is": "1"}
};

csp.CometSession = function() {
    var self = this;
    self.id = ++id;
    self.url = null;
    self.readyState = csp.readyState.initial;
    self.sessionKey = null;
    var transport = null;
    var options = null;
    var buffer = "";
    self.write = function() { throw new Error("invalid readyState"); }
    self.onopen = function() {
	//               log('onopen', self.sessionKey);
    }

    self.onclose = function(code) {
	//        log('onclose', code);
    }

    self.onread = function(data) {
	//        log('onread', data);
    }

    self.setEncoding = function(encoding) {
        switch(encoding) {
            case 'plain':
                if (buffer) {
                    self.onread(buffer);
                    buffer = "";
                }
                break;
            case 'utf8':
                break
            default:
                throw new Error("Invalid encoding")
        }
        options.encoding = encoding;
    }

    // XXX: transport_onread and self.write both need to use an incremental
    //      utf8 codec.

    var transport_onread = function(data) {
        if (options.encoding == 'utf8') {
            // XXX buffer remainder from incremental utf-8 decoding
            self.onread(utf8.decode(data)[0]);
        }
        else if (options.encoding == 'plain') {
            self.onread(data);
        }
    }

    self.write = function(data) {
        switch(options.encoding) {
            case 'plain':
                transport.send(data);
                break;
            case 'utf8':
                transport.send(utf8.encode(data));
                break;
        }
    }

    self.connect = function(url, _options) {
        options = _options || {};
        if (!options.encoding) { options.encoding = 'utf8' }
        var timeout = options.timeout || 10000;
        self.readyState = csp.readyState.opening;
        self.url = url;

        transport = new (csp.util.chooseTransport(url, options))(self.id, url, options);
        var handshakeTimer = window.setTimeout(self.close, timeout);
        transport.onHandshake = function(data) {
            self.readyState = csp.readyState.open;
            self.sessionKey = data.session;
            transport.onPacket = transport_onread;
            transport.resume(self.sessionKey, 0, 0);
            clearTimeout(handshakeTimer);
            self.onopen();
        }
        transport.handshake();
    }
    self.close = function() {
        transport.close();
        self.readyState = csp.readyState.closed;
        self.onclose();
    }
}

var Transport = function(cspId, url) {
//    log('url', url);
    var self = this;
    self.opened = false;
    self.cspId = cspId;
    self.url = url;
    self.buffer = "";
    self.packetsInFlight = null;
    self.sending = false;
    self.sessionKey = null;
    self.lastEventId = null;

    this.handshake = function() {
        self.opened = true;
    }
    self.processPackets = function(packets) {
        for (var i = 0; i < packets.length; i++) {
            var p = packets[i];
            if (p === null)
                return self.doClose();
            var ackId = p[0];
            var encoding = p[1];
            var data = p[2];
            if (self.lastEventId != null && ackId <= self.lastEventId)
                continue;
            if (self.lastEventId != null && ackId != self.lastEventId+1)
                throw new Error("CSP Transport Protocol Error");
            self.lastEventId = ackId;
            if (encoding == 1) { // base64 encoding
                try {
                    data = base64.decode(data);
                } catch(e) {
                    self.close()
                    return;
                }
            }
            self.onPacket(data);
        }
    }
    self.resume = function(sessionKey, lastEventId, lastSentId) {
        self.sessionKey = sessionKey;
        self.lastEventId = lastEventId;
        self.lastSentId = lastSentId;
        self.reconnect();
    }
    self.send = function(data) {
        self.buffer += data;
        if (!self.packetsInFlight) {
            self.doSend();
        }
    }
    self.doSend = function() {
        throw new Error("Not Implemented");
    }
    self.close = function() {
        self.stop();
    }
    self.stop = function() {
        self.opened = false;
        clearTimeout(cometTimer);
        clearTimeout(sendTimer);
        clearTimeout(handshakeTimer);
    }
    var cometBackoff = BACKOFF; // msg
    var backoff = BACKOFF;
    var handshakeTimer = null;
    var sendTimer = null;
    var cometTimer = null;
    self.handshakeCb = function(data) {
        if (self.opened) {
            self.onHandshake(data);
            backoff = BACKOFF;
        }
    }
    self.handshakeErr = function() {
        if (Math.round(Math.log(backoff) / Math.log(BACKOFF)) == 7) {
            return self.close()
        }
        if (self.opened) {
            handshakeTimer = setTimeout(self.handshake, backoff);
            backoff *= 2;
        }
    }
    self.sendCb = function() {
        self.packetsInFlight = null;
        backoff = BACKOFF;
        if (self.opened) {
            if (self.buffer) {
                self.doSend();
            }
        }
    }
    self.sendErr = function() {
        if (Math.round(Math.log(backoff) / Math.log(BACKOFF)) == 7) {
            return self.close()
        }
        if (self.opened) {
            sendTimer = setTimeout(self.doSend, backoff);
            backoff *= BACKOFF;
        }
    }
    self.cometCb = function(data) {
        if (self.opened) {
            self.processPackets(data);
            self.reconnect();
        }
    }
    self.cometErr = function() {
        if (Math.round(Math.log(cometBackoff) / Math.log(BACKOFF)) == 7) {
            return self.close()
        }
        if (self.opened) {
            cometTimer = setTimeout(self.reconnect, cometBackoff);
            cometBackoff *= 2;
        }
    }
}

var transports = {};

transports.xhr = function(cspId, url) {
    var self = this;
    Transport.call(self, cspId, url);
    var makeXhr = function() {
        if (window.XDomainRequest) {
            return new XDomainRequest();
        }
		if(window.XMLHttpRequest) {
			return new XMLHttpRequest();
		}
		if(window.ActiveXObject) {
			return new ActiveXObject("Msxml2.XMLHTTP");
		}
		
		throw new Error("XHR is not supported in this environment");
    }
    var sendXhr = makeXhr();
    var cometXhr = makeXhr();
    if (!csp.util.isSameDomain(url, location.toString())) {
        if (!window.XDomainRequest)
        if (sendXhr.withCredentials === undefined) {
            throw new Error("Invalid cross-domain transport");
        }
    }

    var makeRequest = function(type, url, args, cb, eb, timeout) {
        var xhr;
        if (type == 'send') { xhr = sendXhr; }
        if (type == 'comet') { xhr = cometXhr; }
	url += "?";
	for (key in args) {
            if (key != 'd') {
	      url += key + '=' + args[key] + '&';
	    }
	}
	if (url.match('\\?$'))
	  { url = url.slice(0, url.length-1); }
        var payload = "";
        if (args.d) {
            payload = args.d;
        }
        xhr.open('POST', self.url + url, true);
        xhr.setRequestHeader('Content-Type', 'text/plain')
        var aborted = false;
        var timer = null;
//        log('setting on ready state change');
        xhr.onreadystatechange = function() {
//            log('ready state', xhr.readyState)
            try {
//              log('status', xhr.status)
            } catch (e) {}
            if (aborted) {
//                log('aborted');
                return eb();
            }
            if (xhr.readyState == 4) {
                try {
		    // xhr.status will be 0 for localhost requests.
		    // this is probably ok. - desmaj 2009-28-09
                    if (xhr.status == 200 || xhr.status == 0) {
//		      log("clearing timer");
                        clearTimeout(timer);
                        // XXX: maybe the spec shouldn't wrap ALL responses in ( ).
                        //      -mcarter 8/11/09
//		      log("parsing data");
//		      log("length: " + xhr.responseText.length);
                        var data = JSON.parse(xhr.responseText.substring(1, xhr.responseText.length-1));
//		      log("parsed data");
					}
				} catch(e) {}

				if(data) {
			        try {
	                    // try-catch the callback since we parsed the response
	                    cb(data);
	                } catch(e) {
						// use a timeout to get proper tracebacks
						setTimeout(function() {
							//		log(e);
							throw e;
						}, 0);
	                }
					return;
				}

                try {
//                    log('xhr.responseText', xhr.responseText);
                } catch(e) {
                    //log('ex');
                }
                return eb();
            }
        }
        if (timeout) {
            timer = setTimeout(function() { aborted = true; xhr.abort(); }, timeout*1000);
        }
//        log('send xhr', payload);
        xhr.send(payload)

    }

    this.handshake = function() {
        self.opened = true;
        makeRequest("send", "/handshake", { d:"{}" }, self.handshakeCb, self.handshakeErr, 10);
    }
    this.doSend = function() {
        var args;
        if (!self.packetsInFlight) {
            self.packetsInFlight = self.toPayload(self.buffer)
            self.buffer = "";
        }
        args = { s: self.sessionKey, d: self.packetsInFlight };
        makeRequest("send", "/send", args, self.sendCb, self.sendErr, 10);
    }
    this.reconnect = function() {
        var args = { s: self.sessionKey, a: self.lastEventId }
        makeRequest("comet", "/comet", args, self.cometCb, self.cometErr, 40);
    }
    this.toPayload = function(data) {
        // TODO: only base64 encode sometimes.
        var payload = JSON.stringify([[++self.lastSentId, 1, base64.encode(data)]]);
        return payload
    }
}
log('csp is', csp);
log('global.csp is', global.csp);
if (!global.csp) {
    log('obliterate csp', global.csp);
    global.csp = {}
}
global.csp._jsonp = {}
var _jsonpId = 0;
function setJsonpCallbacks(cb, eb) {
    global.csp._jsonp['cb' + (++_jsonpId)] = cb;
    global.csp._jsonp['eb' + (_jsonpId)] = eb;
    return _jsonpId;
}
function removeJsonpCallback(id) {
    delete global.csp._jsonp['cb' + id];
    delete global.csp._jsonp['eb' + id];
}
function getJsonpErrbackPath(id) {
    return 'parent.csp._jsonp.eb' + id;
}
function getJsonpCallbackPath(id) {
    return 'parent.csp._jsonp.cb' + id;
}

transports.jsonp = function(cspId, url) {
    var self = this;
    Transport.call(self, cspId, url);
    var createIframe = function() {
        var i = document.createElement("iframe");
        i.style.display = 'block';
        i.style.width = '0';
        i.style.height = '0';
        i.style.border = '0';
        i.style.margin = '0';
        i.style.padding = '0';
        i.style.overflow = 'hidden';
        i.style.visibility = 'hidden';
        return i;
    }
    var ifr = {
        'bar':   createIframe(),
        'send':  createIframe(),
        'comet': createIframe()
    };

    var killLoadingBar = function() {
        window.setTimeout(function() {
            document.body.appendChild(ifr.bar);
            document.body.removeChild(ifr.bar);
        }, 0);
    }
    var rId = 0;
    var makeRequest = function(rType, url, args, cb, eb, timeout) {
        args.n = Math.random();
        window.setTimeout(function() {
            var temp = ifr[rType];
            // IE6+ uses contentWindow.document, the others use temp.contentDocument.
            var doc = temp.contentDocument || temp.contentWindow.document || temp.document;
            var head = doc.getElementsByTagName('head')[0] || doc.getElementsByTagName('body')[0];
            var errorSuppressed = false;
            function errback(isIe) {
                if (!isIe) {
                    var scripts = doc.getElementsByTagName('script');
                    var s1 = doc.getElementsByTagName('script')[0];
                    var s2 = doc.getElementsByTagName('script')[1];
                    s1.parentNode.removeChild(s1);
                    s2.parentNode.removeChild(s2);
                }
                removeJsonpCallback(jsonpId);
                if (!errorSuppressed && self.opened) {
                    eb.apply(null, arguments);
                }
            }
            function callback() {
                errorSuppressed = true;
                if (self.opened) {
                    cb.apply(null, arguments);
                }
                else {
//                    log('suppressing callback', rType, url, args, cb, eb, timeout);
                }
            }
            var jsonpId = setJsonpCallbacks(callback, errback);
            url += '?'
            for (key in args) {
                url += key + '=' + args[key] + '&';
            }
            if (rType == "send") {
                url += 'rs=;&rp=' + getJsonpCallbackPath(jsonpId);
            }
            else if (rType == "comet") {
                url += 'bs=;&bp=' + getJsonpCallbackPath(jsonpId);
            }
            var s = doc.createElement("script");
            s.src = self.url + url;
            head.appendChild(s);

            if (s.onreadystatechange === null) { // IE
                // TODO: I suspect that if IE gets half of an HTTP body when
                //       the connection resets, it will go ahead and execute
                //       the script tag as if all were well, and then fail
                //       silently without a loaded event. For this reason
                //       we should probably also set a timer of DURATION + 10
                //       or something to catch timeouts eventually.
                //      -Mcarter 8/11/09
                s.onreadystatechange = function() {
                    if (s.readyState == "loaded") {
                        errback(true);
                    }
                }
            }
            else {
                var s = doc.createElement("script");
                s.innerHTML = getJsonpErrbackPath(jsonpId) + '(false);'
                head.appendChild(s);
                killLoadingBar();
            }
        }, 0);

    }

    this.handshake = function() {
        self.opened = true;
        // This setTimeout is necessary to avoid timing issues with the iframe onload status
        setTimeout(function() {
            makeRequest("send", "/handshake", {d: "{}"}, self.handshakeCb, self.handshakeErr, 10)
        }, 0);
    }
    this.doSend = function() {
        var args;
        if (!self.packetsInFlight) {
            self.packetsInFlight = self.toPayload(self.buffer)
            self.buffer = "";
        }
        args = { s: self.sessionKey, d: self.packetsInFlight };
        makeRequest("send", "/send", args, self.sendCb, self.sendErr, 10);
    }
    this.reconnect = function() {
        var args = { s: self.sessionKey, a: self.lastEventId }
        makeRequest("comet", "/comet", args, self.cometCb, self.cometErr, 40);
    }
    this.toPayload = function(data) {
        // TODO: don't always base64?
        var payload = JSON.stringify([[++self.lastSentId, 1, base64.encode(data)]]);
        return payload
    }
    document.body.appendChild(ifr.send);
    document.body.appendChild(ifr.comet);
    killLoadingBar();
}
}).call(typeof(exports) != 'undefined' ? exports : (function() { window.csp = {}; return csp; })(), typeof(global) == 'undefined' ? window : global)
