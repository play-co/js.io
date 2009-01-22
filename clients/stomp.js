/*
 * standalone stomp client
 * js.io 2.3.1
 * http://js.io
 */

js = {'io': {'protocols': {'stomp': {}}}}
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
js.io.setSocket();STOMP_DEBUG = false;LineProtocol = function(transport) {var log = js.io.getLogger("LineProtocol", STOMP_DEBUG);var self = this;var buffer = null;var isLineMode = true;transport.onopen = function() {buffer = "";isLineMode = true;self.onopen();};transport.onclose = function(code) {buffer = null;self.onclose(code);};transport.onerror = function(error) {self.onerror(error);};transport.onread = function(data) {log.debug("transport.onread: enter isLineMode=", isLineMode, " buffer[", buffer.length, "]=", buffer, " data[", data.length, "]=", data);if (isLineMode) {buffer += data;data = "";var start = 0;var end;while ((end = buffer.indexOf("\n", start)) >= 0 && isLineMode) {var bytes = buffer.slice(start, end);var line = Orbited.utf8.decode(bytes)[0];log.debug("fire onlinereceived line[", line.length, "]=", line);self.onlinereceived(line);start = end + 1;}
buffer = buffer.slice(start);if (isLineMode) {} else {data = buffer;buffer = "";}}
if (data.length > 0) {log.debug("fire onrawdatareceived data[", data.length, "]=", data);self.onrawdatareceived(data);}
log.debug("transport.onread: leave");};self.setRawMode = function() {log.debug("setRawMode");isLineMode = false;};self.setLineMode = function(extra) {log.debug("setLineMode: extra=", extra);isLineMode = true;if (extra && extra.length > 0)
transport.onread(extra);};self.send = function(data) {log.debug("send: data=", data);return transport.send(data);};self.open = function(host, port, isBinary) {log.debug("open: host=", host, ':', port, ' isBinary=', isBinary);transport.open(host, port, isBinary);};self.close = function() {log.debug("close");transport.close();};self.reset = function() {transport.reset();}
self.onopen = function() {};self.onclose = function() {};self.onerror = function(error) {};self.onlinereceived = function(line) {};self.onrawdatareceived = function(data) {};};js.io.protocols.stomp.Client = function() {var log = js.io.getLogger("js.io.protocols.stomp.Client", STOMP_DEBUG);var self = this;var protocol = null;var buffer = "";var type = null;var headers = null;var remainingBodyLength = null;self.user = null;function trim(str) {return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');}
function mergeObject(dst, src) {for (var k in src) {dst[k] = src[k];}
return dst;}
function protocol_onLineReceived(line) {log.debug("protocol_onLineReceived: line=", line);if (line.length == 0) {if (type === null)
return;log.debug("onLineReceived: all headers:");log.dir(headers);if ('content-length' in headers) {remainingBodyLength = parseInt(headers['content-length']) + 1;} else {remainingBodyLength = null;}
protocol.setRawMode();return;}
if (type === null) {log.debug("onLineReceived: begin ", line, " frame");type = line;headers = {};buffer = "";remainingBodyLength = null;return;}
var sep = line.search(":");var key = trim(line.slice(0, sep));var value = trim(line.slice(sep + 1));headers[key] = value;log.debug("onLineReceived: found header ", key, "=", value);}
if (STOMP_DEBUG) {function dumpStringAsIntArray(title, data) {var bytes = [];for (var n = 0; n < data.length; ++n) {bytes.push(data.charCodeAt(n));}
log.debug(title);log.debug('length=', bytes.length, " bytes=", bytes);}} else {function dumpStringAsIntArray() {}}
function protocol_onRawDataReceived(data) {log.debug("protocol_onRawDataReceived");dumpStringAsIntArray("buffer", buffer);dumpStringAsIntArray("data", data);if (remainingBodyLength === null) {buffer += data;var end = buffer.indexOf("\0");if (end >= 0) {var bytes = buffer.slice(0, end);buffer = buffer.slice(end + 1);doDispatch(bytes, buffer);}} else {var toRead = Math.min(data.length, remainingBodyLength);remainingBodyLength -= toRead;if (remainingBodyLength === 0) {var bytes = data.slice(0, toRead - 1);} else {var bytes = data.slice(0, toRead);}
data = data.slice(toRead);buffer += bytes;if (remainingBodyLength === 0) {doDispatch(buffer, data);}}}
function doDispatch(bytes, extra) {log.debug("doDispatch: bytes[", bytes.length, "]=", bytes, " extra[", extra.length, "]=", extra);dumpStringAsIntArray("bytes", bytes);dumpStringAsIntArray("extra", extra);var frame = {type: type,
headers: headers,
body: Orbited.utf8.decode(bytes)[0]};log.debug("doDispatch: end frame; body.length=", frame.body.length);log.dir(frame);self.onframe(frame);buffer = "";type = null;headers = {};remainingBodyLength = null;protocol.setLineMode(extra);}
function Ignored() {}
self.onopen = Ignored;self.onclose = Ignored;self.onerror = Ignored;self.onframe = function(frame) {switch (frame.type) {case 'CONNECTED':self.onconnectedframe(frame);break;case 'MESSAGE':self.onmessageframe(frame);break;case 'RECEIPT':self.onreceiptframe(frame);break;case 'ERROR':self.onerrorframe(frame);break;default:throw("Unknown STOMP frame type " + frame.type);}};self.onconnectedframe = Ignored;self.onreceiptframe = Ignored;self.onmessageframe = function(frame) {if (this.onmessage)
this.onmessage(frame);};self.onerrorframe = Ignored;self.onmessage = Ignored;self.sendFrame = function(type, headers, body) {var head = [type];var ignoreHeaders = {};if (body && headers['content-length'] === undefined) {if (headers["content-type"] === undefined) {head.push("content-type:text/plain");ignoreHeaders["content-type"] = true;}
if (headers["content-encoding"] === undefined) {head.push("content-encoding:utf-8");ignoreHeaders["content-encoding"] = true;body = Orbited.utf8.encode(body);}
head.push("content-length:" + body.length);ignoreHeaders["content-length"] = true;}
for (var key in headers) {if (!(key in ignoreHeaders))
head.push(key + ":" + headers[key]);}
head.push("\n");var bytes = Orbited.utf8.encode(head.join("\n"));if (body) {bytes += body;}
bytes += "\x00";protocol.send(bytes);};self.send_frame = self.sendFrame;self.connect = function(domain, port, user, password) {self.user = user;function onopen() {self.sendFrame("CONNECT", {'login':user, 'passcode':password});self.onopen();}
protocol = self._createProtocol();protocol.onopen = onopen;protocol.onclose = self.onclose;protocol.onerror = self.onerror;protocol.onlinereceived = protocol_onLineReceived;protocol.onrawdatareceived = protocol_onRawDataReceived;protocol.open(domain, port, true);};self._createProtocol = function() {return new LineProtocol(new js.io.TCPSocket());};self.disconnect = function() {self.sendFrame("DISCONNECT");};self.send = function(message, destination, extraHeaders) {self.sendFrame("SEND", mergeObject({destination:destination}, extraHeaders), message);};self.subscribe = function(destination, extraHeaders) {self.sendFrame("SUBSCRIBE", mergeObject({destination:destination}, extraHeaders));};self.unsubscribe = function(destination, extraHeaders) {self.sendFrame("UNSUBSCRIBE", mergeObject({destination:destination}, extraHeaders));};self.begin = function(id) {self.sendFrame("BEGIN", {"transaction": id});};self.commit = function(id) {self.sendFrame("COMMIT", {"transaction": id});};self.abort = function(id) {self.sendFrame("ABORT", {"transaction": id});};self.ack = function(message_id, transaction_id) {};}