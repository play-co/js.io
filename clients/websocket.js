/*
 * standalone websocket client
 * js.io 2.3
 * http://js.io
 */

js = {'io': {'tools': {'parseurl': {}, 'io': {'delimiter': {}}}, 'protocols': {'websocket': {}}}}
js.io.DEBUG = false;js.io.getLogger = function( loggerName,  loggerOn) {if (loggerOn == null) {loggerOn = js.io.DEBUG;}
if (loggerOn && typeof(Orbited)) {var logger = Orbited.getLogger(name);if (!("dir" in logger)) {logger.dir = function() {};}
return logger;}
else if (loggerOn && typeof(console)) {return {debug: function() {var args = Array.prototype.slice.call(arguments);args.unshift(name, ": ");console.debug.apply(console, args);},
dir: function() {console.debug(name, ":");console.dir.apply(console, arguments);}};}
else {return {debug: function() {},
dir: function() {}};}}
js.io.setSocket = function( s) {if (s) {js.io.TCPSocket = s;}
else if (js.io.TCPSocket == null) {js.io.TCPSocket = _discoverSocket();}}
var _discoverSocket = function() {try { return TCPSocket; } catch(e) {}
try { return Orbited.TCPSocket; } catch(e) {}}
js.io.setSocket();js.io.tools.io.delimiter.Reader = function() {var self = this;var buff = "";var delim = null;var cb = null;var separate_events = function() {var sep = buff.indexOf(delim);if (sep == -1) {return;}
var frame = buff.slice(0,sep);buff = buff.slice(sep+delim.length);cb(frame);separate_events();}
self.set_delim = function(d) {delim = d;}
self.set_cb = function(func) {cb = func;}
self.read = function(data) {buff += data;separate_events();}}
js.io.tools.parseurl.Parse = function(u) {var self = this;self.success = false;self.url = u;[self.scheme, self.address] = u.split(":self.scheme = self.scheme.toLowerCase();[self.hostport, self.path] = self.address.split("/");[self.host, self.port] = self.hostport.split(":");self.path = self.path || '';[self.path, self.fragment] = self.path.split("#");[self.path, self.query] = self.path.split("?");if (self.scheme && self.hostport) {self.success = true;}}
function js.io.protocols.websocket.Client(url) {var FRAME_START = String.fromCharCode(0);var FRAME_END = String.fromCharCode(255);var SCHEMES = { "wss": [true, 815], "ws": [false, 81] }
var STATUS = "HTTP/1.1 101 Web Socket Protocol Handshake";var headers = {}
var reader = new js.io.tools.io.delimiter.Reader();var conn = new js.io.TCPSocket();var self = this;var error = function(msg, no_close) {if (! no_close) {self.readyState = self.CLOSED;conn.close();}
throw new Error(msg);}
var onOpen = function() {conn.send("GET " + resource + " HTTP/1.1\r\nUpgrade: WebSocket\r\nConnection: Upgrade\r\nHost: " + host + "\r\nOrigin: " + origin + "\r\n\r\n");}
var onClosed = function() {if (self.onclosed) { self.onclosed(); }}
var setHeader = function(line) {var colSplit = line.indexOf(':');var key = line.slice(0,colSplit).toLowerCase();var val = line.slice(colSplit+1);if (val[0] == ' ') {val = val.slice(1);}
if (!key || !val) {error('NULL_HEADER_ERR');}
if (key.indexOf('\r') != -1 || key.indexOf('\n') != -1) {error('INVALID_HEADER_ERR');}
if (key in headers) {error('DUPLICATE_HEADER_ERR');}
if (key == "websocket-origin" && val != origin) {error('WRONG_ORIGIN_ERR');}
else if (key == "websocket-location" && val != url) {error('WRONG_LOCATION_ERR');}
else if (key == "upgrade" && val != "WebSocket") {error('WRONG_UPGRADE_ERR');}
else if (key == "connection" && val != "Upgrade") {error('WRONG_CONNECTION_ERR');}
headers[key] = val;}
var recv = function(data) {if (self.readyState == self.CONNECTING) {var lines = data.split("\r\n");var status = lines[0];lines = lines.slice(1);if (status != STATUS) {error('HANDSHAKE_ERR');}
for (var n=0; n<lines.length; n++) {setHeader(lines[n]);}
if ("websocket-origin" in headers && "websocket-location" in headers && "upgrade" in headers && "connection" in headers) {reader.set_delim(FRAME_END);self.readyState = self.OPEN;if (self.onopen) { self.onopen(); }}
else {error('MISSING_HEADER_ERR');}}
else if (self.readyState == self.OPEN) {if (data[0] != FRAME_START) {error('INVALID_FRAME_ERR');}
if (self.onmessage) {self.onmessage(data.slice(1));}}}
if (url[url.length-1] != '/') {url += '/';}
var parsedUrl = new js.io.tools.parseurl.Parse(url);if (!parsedUrl.success || ! parsedUrl.scheme in SCHEMES) {error('SYNTAX_ERR', true);}
var scheme = parsedUrl.scheme;var secure = SCHEMES[scheme][0];var host = parsedUrl.host;var port = parsedUrl.port || SCHEMES[scheme][1];var resource = parsedUrl.path || "/";if (parsedUrl.query) {resource += "?" + parsedUrl.query;}
var origin = scheme + ":if (document.location.port) {origin += ":" + document.location.port;}
self.CONNECTING = 0;self.OPEN = 1;self.CLOSED = 2;self.onopen = null;self.onmessage = null;self.onclosed = null;self.readyState = self.CONNECTING;self.url = url;self.postMessage = function(data) {if (self.readyState != self.OPEN) {error('INVALID_STATE_ERR', true);}
conn.send(FRAME_START + data + FRAME_END);}
self.disconnect = function() {conn.close();self.readyState = self.CLOSED;}
reader.set_delim("\r\n\r\n");reader.set_cb(recv);conn.onread = reader.read;conn.onopen = onOpen;conn.onclose = onClosed;conn.open(host, port, true);}