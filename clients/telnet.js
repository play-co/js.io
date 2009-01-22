/*
 * standalone telnet client
 * js.io 2.3.1
 * http://js.io
 */

js = {'io': {'tools': {'io': {'delimiter': {}}}, 'protocols': {'telnet': {}}}}
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
js.io.protocols.telnet.Client = function() {var self = this
var conn = null
var reader = null
var ENDL = "\r\n"
self.onopen = function() {}
self.onmessage = function() {}
self.onclose = function(code) {}
self.connect = function(host, port) {reader = new js.io.tools.io.delimiter.Reader()
reader.set_cb(dispatch)
reader.set_delim(ENDL)
conn = new js.io.TCPSocket();conn.onread = reader.read
conn.onclose = close
conn.onopen = open
conn.open(host, port);}
self.close = function() {conn.close()}
self.send = function(s) {send(s + ENDL)}
var send = function(s) {conn.send(s)}
var open = function() {self.onopen()}
var close = function(code) {self.onclose(code)}
var dispatch = function(msg) {self.onmessage(msg)}}