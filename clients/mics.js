/*
 * standalone mics client
 * js.io 2.3.1
 * http://js.io
 */

js = {'io': {'tools': {'io': {'xml': {}}}, 'protocols': {'mics': {}}}}
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
function js.io.protocols.mics.Client() {var self = this;var conn = null;var cbs = {};var switch_time = null;var reader = new js.io.tools.io.xml.Reader();var parse_event = function(node) {if (node.nodeName in cbs) {cb = cbs[node.nodeName];switch (node.nodeName) {case 'chat':var n = node.getAttribute('name');var m = node.firstChild.data.replace("&lt;","<").replace("&gt;",">");cb(n, m);break;case 'confirm':cb();break;case 'draw':cb();break;case 'game':var c = node.getAttribute('color');var ini = node.getAttribute('initial');var inc = node.getAttribute('increment');cb(c, ini, inc);break;case 'gameover':var outcome = node.getAttribute('outcome');var reason = node.getAttribute('reason');cb(outcome, reason);break;case 'list':for (var i=0;i<node.childNodes.length;i++) {var n = node.childNodes[i];var name = i.getAttribute('name');var ini = parseInt(n.getAttribute('initial'));var inc = parseInt(n.getAttribute('increment'));cb(name, ini, inc);}
break;case 'move':received();if (switch_time) { switch_time(); }
var f = node.getAttribute('from');var t = node.getAttribute('to');var p = null;if (node.hasAttribute('promotion')) {p = node.getAttribute('promotion');}
cb(f, t, p);break;case 'notice':cb(node.firstChild.data);break;case 'time':var w = parseFloat(node.getAttribute('white'));var b = parseFloat(node.getAttribute('black'));cb(w, b);break;}}
else {alert("client incomplete. assign callback for "+node.nodeName+" frame.");}}
var received = function() {send("<received/>");}
var send = function(data) {if (conn) {conn.send(data);}
else {alert("you haven't called js.io.protocols.mics.Client.connect, so you can't send this data: "+data);}}
var on_connect = function() {if ('notice' in cbs) {cbs['notice']('connection established');}}
var on_close = function() {if ('notice' in cbs) {cbs['notice']('connection lost');}}
self.connect = function(host, port) {reader.set_cb(parse_event);conn = new js.io.TCPSocket();conn.onread = reader.read;conn.onopen = on_connect;conn.onclose = on_close;conn.open(host, port, false);}
self.set_cb = function(frame, cb) {cbs[frame] = cb;}
self.set_timechange_cb = function(cb) {switch_time = cb;}
self.read = function(data) {reader.read(data);}
self.chat = function(msg) {send("<chat>"+msg.replace("<","&lt;").replace(">","&gt;")+"</chat>");}
self.draw = function() {send("<draw/>");}
self.forfeit = function() {send("<forfeit/>");}
self.list = function() {send("<list/>");}
self.move = function(from, to, promotion) {var m = "<move from='"+from+"' to='"+to+"' gameover='check'";if (promotion) {m += " promotion='"+promotion+"'";}
m += "/>";send(m);}
self.seek = function(name, initial, increment) {send("<seek name='"+name+"' initial='"+initial+"' increment='"+increment+"'/>");}
self.timeout = function() {send("<timeout/>");}}