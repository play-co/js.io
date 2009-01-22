/*
 * standalone xmpp client
 * js.io 2.3.1
 * http://js.io
 */

js = {'io': {'tools': {'io': {'xml': {}}}, 'protocols': {'xmpp': {}}}}
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
js.io.setSocket();js.io.tools.io.xml.Reader = function() {var self = this;var parse = null;var cb = null;var name = null;var buff = "";var checked = 0;var get_parser = function() {var parser = null;if (window.DOMParser) {parser = new DOMParser();parse = function(s) {return parser.parseFromString(s, "text/xml");}}
else if (window.ActiveXObject) {parse = function(s) {parser = new ActiveXObject("Microsoft.XMLDOM");parser.async = "false";parser.loadXML(s);return parser;}}
else {alert("can't find suitable XML parser! what kind of crazy browser are you using?");}}
var separate_events = function() {if (!name) {if (!buff) {return;}
if (buff.slice(0,1) != "<") {checked = 0;buff = buff.slice(1);return separate_events();}
close_index = buff.indexOf(">");if (close_index == -1) {return;}
if (buff[close_index-1] == "/") {var frame = parse(buff.slice(0,close_index+1)).firstChild;buff = buff.slice(close_index+1);checked = 0;cb(frame);return separate_events();}
name = buff.slice(1,close_index);var s = name.indexOf(" ");if (s != -1) {name = name.slice(0,s);}
checked = close_index+1;}
var i = buff.indexOf(">", checked);while (i != -1) {if (buff.slice(i-2-name.length,i+1) == "</"+name+">") {var frame = parse(buff.slice(0, i+1)).firstChild;if (frame.nodeName == "parsererror") {var frame = parse(buff.slice(0, i+1).replace("&","&amp;")).firstChild;}
buff = buff.slice(i+1);checked = 0;name = null;cb(frame);return separate_events();}
else {checked = i+1;i = buff.indexOf(">", checked);}}}
self.set_cb = function(func) {cb = func;}
self.read = function(data) {buff += data;separate_events();}
get_parser();}
CONNECT = ["<stream:stream to='","' xmlns='jabber:client' xmlns:stream='http:REGISTER = ["<iq type='set'><query xmlns='jabber:iq:register'><username>","</username><password>","</password></query></iq>"];LOGIN = ["<iq type='set'><query xmlns='jabber:iq:auth'><username>","</username><password>","</password><resource>js.io</resource></query></iq>"];ROSTER = ["<iq from='","' type='get'><query xmlns='jabber:iq:roster'/></iq><presence/>"];MSG = ["<message from='","' to='","' xml:lang='en' type='chat'><body>","</body></message>"];PRESENCE = ["<presence from='","' to='","' type='","'/>"];js.io.protocols.xmpp.Client = function() {var self = this;var host = null;var port = null;var conn = null;var user = null;var domain = null;var bare_jid = null;var full_jid = null;var success = null;var failure = null;var parser = new js.io.tools.io.xml.Reader();self.onPresence = function(ntype, from) {}
self.onMessage = function(jid, username, text) {}
self.onSocketConnect = function() {}
self.sendSubscribed = function(jid, me_return) {self.send(construct(PRESENCE, [me_return, jid, "subscribed"]));}
self.connect = function(h, p) {host = h;port = p;reconnect();}
self.msg = function(to, content) {self.send(construct(MSG, [user, to, content]));}
self.unsubscribe = function(buddy) {self.send(construct(PRESENCE, [bare_jid, buddy.slice(0, buddy.indexOf('/')), "unsubscribe"]));}
self.subscribe = function(buddy) {self.send(construct(PRESENCE, [bare_jid, buddy, "subscribe"]));}
self.send = function(s) {conn.send(s);}
self.quit = function() {self.send(PRESENCE[0] + full_jid + PRESENCE[2] + "unavailable" + PRESENCE[3]);}
self.register = function(nick, pass, s, f) {conn.onread = regUser;success = s;failure = f;user = nick;bare_jid = nick + "@" + domain;full_jid = bare_jid + "/js.io";self.send(construct(REGISTER, [user, pass]));}
self.login = function(nick, pass, s, f) {conn.onread = setUser;success = s;failure = f;user = nick;bare_jid = nick + "@" + domain;full_jid = bare_jid + "/js.io";self.send(construct(LOGIN, [user, pass]));}
self.connectServer = function(d, s, f) {success = s;failure = f;domain = d;self.send(construct(CONNECT, [domain]));}
var construct = function(list1, list2) {var return_str = "";for (var i = 0; i < list2.length; i++) {return_str += list1[i] + list2[i];}
return return_str + list1[i];}
var reconnect = function() {conn = new js.io.TCPSocket();conn.onread = setDomain;conn.onopen = self.onSocketConnect;conn.onclose = close;parser.set_cb(nodeReceived);conn.open(host, port, false);}
var nodeReceived = function(node) {if (node.nodeName == "message") {var from = node.getAttribute("from");var c = node.childNodes;for (var i = 0; i < c.length; i++) {if (c[i].nodeName == "body") {self.onMessage(from, from, c[i].textContent);}}}
else if (node.nodeName == "presence") {var ntype = node.getAttribute("type");var from = node.getAttribute("from");var to = node.getAttribute("to");self.onPresence(ntype, from, to);}}
var setDomain = function(s) {if (s.indexOf("host-unknown") != -1) {if (failure) {failure();}}
else {if (success) {success();}}}
var regUser = function(s) {if (s.indexOf("conflict") != -1) {if (failure) {failure();}}
else {conn.onread = parser.read;if (success) {success();}}}
var setUser = function(s) {if (s.indexOf("not-authorized") != -1) {if (failure) {failure();}}
else {conn.onread = parser.read;self.send(construct(ROSTER, [bare_jid]));if (success) {success();}}}
var close = function(code) {reconnect();}}