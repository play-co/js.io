/**********************************
* author: Mario Balibrera
*    web: mariobalibrera.com
*  email: mario.balibrera@gmail.com
**********************************/

js.io.require('js.io.tools.io.xml');
js.io.provide('js.io.protocols.xmpp');

CONNECT = ["<stream:stream to='","' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams'>"];
REGISTER = ["<iq type='set'><query xmlns='jabber:iq:register'><username>","</username><password>","</password></query></iq>"];
LOGIN = ["<iq type='set'><query xmlns='jabber:iq:auth'><username>","</username><password>","</password><resource>Orbited</resource></query></iq>"];
ROSTER = ["<iq from='","' type='get'><query xmlns='jabber:iq:roster'/></iq><presence/>"];
MSG = ["<message from='","' to='","' xml:lang='en' type='chat'><body>","</body></message>"];
PRESENCE = ["<presence from='","' to='","' type='","'/>"];

XMPPClient = function() {
    var self = this;
    var host = null;
    var port = null;
    var conn = null;
    var user = null;
    var domain = null;
    var bare_jid = null;
    var full_jid = null;
    var success = null;
    var failure = null;
    var parser = new js.io.tools.io.xml.Reader();
    self.onPresence = function(ntype, from) {}
    self.onMessage = function(jid, username, text) {}
    self.onSocketConnect = function() {}
    self.sendSubscribed = function(jid, me_return) {
        self.send(construct(PRESENCE, [me_return, jid, "subscribed"]));
    }
    self.connect = function(h, p) {
        host = h;
        port = p;
        reconnect();
    }
    self.msg = function(to, content) {
        self.send(construct(MSG, [user, to, content]));
    }
    self.unsubscribe = function(buddy) {
        self.send(construct(PRESENCE, [bare_jid, buddy.slice(0, buddy.indexOf('/')), "unsubscribe"]));
    }
    self.subscribe = function(buddy) {
        self.send(construct(PRESENCE, [bare_jid, buddy, "subscribe"]));
    }
    self.send = function(s) {
        /////////
        // send raw xml to jabber server with this function
        /////////
        conn.send(Orbited.utf8.encode(s));
    }
    self.quit = function() {
        self.send(PRESENCE[0] + full_jid + PRESENCE[2] + "unavailable" + PRESENCE[3]);
    }
    self.register = function(nick, pass, s, f) {
        conn.onread = regUser;
        success = s;
        failure = f;
        user = nick;
        bare_jid = nick + "@" + domain;
        full_jid = bare_jid + "/Orbited";
        self.send(construct(REGISTER, [user, pass]));
    }
    self.login = function(nick, pass, s, f) {
        conn.onread = setUser;
        success = s;
        failure = f;
        user = nick;
        bare_jid = nick + "@" + domain;
        full_jid = bare_jid + "/Orbited";
        self.send(construct(LOGIN, [user, pass]));
    }
    self.connectServer = function(d, s, f) {
        success = s;
        failure = f;
        domain = d;
        self.send(construct(CONNECT, [domain]));
    }
    var construct = function(list1, list2) {
        var return_str = "";
        for (var i = 0; i < list2.length; i++) {
            return_str += list1[i] + list2[i];
        }
        return return_str + list1[i];
    }
    var reconnect = function() {
        conn = new js.io.TCPSocket();
        conn.onread = setDomain;
        conn.onopen = self.onSocketConnect;
        conn.onclose = close;
        parser.set_cb(nodeReceived);
        conn.open(host, port, true);
    }
    var nodeReceived = function(node) {
        if (node.nodeName == "message") {
            var from = node.getAttribute("from");
            var c = node.childNodes;
            for (var i = 0; i < c.length; i++) {
                if (c[i].nodeName == "body") {
                    self.onMessage(from, from, c[i].textContent);
                }
            }
        }
        else if (node.nodeName == "presence") {
            var ntype = node.getAttribute("type");
            var from = node.getAttribute("from");
            var to = node.getAttribute("to");
            self.onPresence(ntype, from, to);
        }
    }
    var read = function(evt) {
        var s = Orbited.utf8.decode(evt);
        parser.read(s);
    }
    var setDomain = function(evt) {
        var s = Orbited.utf8.decode(evt);
        if (s.indexOf("host-unknown") != -1) {
            if (failure) {failure();}
        }
        else {
            if (success) {success();}
        }
    }
    var regUser = function(evt) {
        var s = Orbited.utf8.decode(evt);
        if (s.indexOf("conflict") != -1) {
            if (failure) {failure();}
        }
        else {
            conn.onread = read;
            if (success) {success();}
        }
    }
    var setUser = function(evt) {
        var s = Orbited.utf8.decode(evt);
        if (s.indexOf("not-authorized") != -1) {
            if (failure) {failure();}
        }
        else {
            conn.onread = read;
            self.send(construct(ROSTER, [bare_jid]));
            if (success) {success();}
        }
    }
    var close = function(code) {
        reconnect();
    }
}

js.io.declare('js.io.protocols.xmpp.Client',XMPPClient,{});
