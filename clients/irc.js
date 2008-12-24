/*
 * standalone irc client
 * js.io 2.3
 * http://js.io
 */

js = {'io': {'tools': {'io': {'delimiter': {}}}, 'protocols': {'irc': {}}}}
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
IRC_DEBUG = false;js.io.protocols.irc.Client = function() {var log = js.io.getLogger("js.io.protocols.irc.Client", IRC_DEBUG);var self = this
var conn = null
var reader = null
var ENDL = "\r\n"
self.onopen = function() {};self.onconnect = function() {}
self.onclose = function() {}
self.onerror = function(command) {}
self.onresponse = function(command) {}
self.connect = function(hostname, port) {log.debug("connect");reader = new js.io.tools.io.delimiter.Reader()
reader.set_cb(dispatch)
reader.set_delim(ENDL)
conn = self._createTransport();conn.onopen = conn_opened
conn.onclose = conn_closed
conn.onread = conn_read
conn.open(hostname, port)}
self._createTransport = function() {return new js.io.TCPSocket();};self.close = function() {log.debug("close");conn.close()
conn.onopen = null;conn.onclose = null;conn.onread = null;self.onclose()}
self.ident = function(nickname, modes, real_name) {send("USER", nickname + " " + modes + " :" + real_name)}
self.nick = function(nickname) {send("NICK", nickname)}
self.join = function(channel) {send("JOIN", channel)}
self.names = function(channel) {send("NAMES", channel)}
self.part = function(channel, reason) {send("PART", channel + " :" + reason)}
self.quit = function(reason) {var reason = reason || "leaving";send("QUIT", ":" + reason)
conn.close()}
self.reset = function() {conn.reset();}
self.action = function(destination, message) {send('PRIVMSG', destination + ' :\01ACTION ' + message + '\01')}
self.privmsg = function(destination, message) {send('PRIVMSG', destination + ' :' + message)}
var conn_opened = function() {self.onopen()}
var conn_closed = function() {self.onclose()}
var conn_read = function(data) {log.debug("data:");log.debug(data);reader.read(data);}
var send = function(type, payload) {log.debug("send: " + payload);conn.send(type + " " + payload + ENDL);};var parse_command = function(s) {var i = s.indexOf(" :");if (i >= 0) {var args = s.slice(0, i).split(' ');args.push(s.slice(i + 2));} else {var args = s.split(' ');}
if (args[0].charAt(0) == ":") {var prefix = args.shift().slice(1);} else {var prefix = null;}
var command = {prefix: prefix,
type: args.shift(),
args: args};log.debug("command:");log.dir(command);return command;};var dispatch = function(line) {command = parse_command(line);if (command.type == "PING") {send("PONG", ":" + command.args)}
if (!isNaN(parseInt(command.type))) {var error_code = parseInt(command.type)
if (error_code > 400)
return self.onerror(command)
else
return self.onresponse(command)}
if (command.type == "PRIVMSG") {msg = command.args[1]
if (msg.charCodeAt(0) == 1 && msg.charCodeAt(msg.length-1) == 1) {var args = [command.args[0]]
var newargs = msg.slice(1, msg.length - 1).split(' ')
if (newargs[0] == 'ACTION') {command.type = newargs.shift()}
else {command.type = 'CTCP'}
for (var i = 0; i < newargs.length; ++i) {args.push(newargs[i])}
command.args = args}}
if (typeof(self["on" + command.type]) == "function") {self["on" + command.type](command);} else {log.debug("unhandled command received: ", command.type);}};};