/**********************************
* XMPP Protocol Client Implementation
*   authors:
*      Mario Balibrera
*      Vlad Shevchenko
**********************************/

js.io.require('js.io.tools.io.xml');
js.io.provide('js.io.protocols.xmpp');

CONNECT = ["<stream:stream to='","' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams'>"];
REGISTER = ["<iq type='set'><query xmlns='jabber:iq:register'><username>","</username><password>","</password></query></iq>"];
LOGIN = ["<iq type='set'><query xmlns='jabber:iq:auth'><username>","</username><password>","</password><resource>","</resource></query></iq>"];
ROSTER = ["<iq from='","' type='get'><query xmlns='jabber:iq:roster'/></iq><presence/>"];
MSG = ["<message from='","' to='","' xml:lang='en' type='chat'><body>","</body></message>"];
GROUPCHAT_MSG = ["<message from='","' to='","' xml:lang='en' type='groupchat'><body>","</body></message>"];
PRESENCE = ["<presence from='","' to='","' type='","'/>"];
EXT_PRESENCE = ["<presence from='","' to='","' type='","'><show>","</show><status>","</status></presence>"];

XMPPClient = function() {
    var self = this;
    var host = null;
    var port = null;
    var conn = null;
    var user = null;
    var domain = null;
    var bare_jid = null;
    var full_jid = null;
    var resource = null;
    var success = null;
    var failure = null;
    var parser = new js.io.tools.io.xml.Reader();
    self.onPresence = function(ntype, from) {}
    self.onMessage = function(jid, username, text) {}
    self.onSocketConnect = function() {}
    self.onUnknownNode = function(node) {}
    self.sendSubscribed = function(jid, me_return) {
        self.send(construct(PRESENCE, [me_return, jid, "subscribed"]));
    }
    self.connect = function(h, p) {
        host = h;
        port = p;
        reconnect();
    }
    self.msg = function(to, content) {
        self.send(construct(MSG, [full_jid, to, content]));
    }
    self.unsubscribe = function(buddy) {
        self.send(construct(PRESENCE, [full_jid, buddy.slice(0, buddy.indexOf('/')), "unsubscribe"]));
    }
    self.subscribe = function(buddy) {
        self.send(construct(PRESENCE, [full_jid, buddy, "subscribe"]));
    }
    self.send = function(s) {
        /////////
        // send raw xml to jabber server with this function
        /////////
        conn.send(s);
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
        full_jid = bare_jid + "/js.io";
        self.send(construct(REGISTER, [user, pass]));
    }
    // resource added
    self.login = function(nick, pass, res, s, f) {
        conn.onread = setUser;
        success = s;
        failure = f;
        user = nick;
        resource = res;
        bare_jid = nick + "@" + domain;
        full_jid = bare_jid + "/" + resource;
        self.send(construct(LOGIN, [user, pass, resource]));
    }
    self.connectServer = function(d, s, f) {
        success = s;
        failure = f;
        domain = d;
        self.send(construct(CONNECT, [domain]));
    }
    //partial support for MUC
    self.join_room = function(room, status, status_msg) {
        room_id = room;
        room_jid = room_id + '/' + user;
        self.send(EXT_PRESENCE[0] + full_jid + EXT_PRESENCE[1] + room_jid + EXT_PRESENCE[3] + status + EXT_PRESENCE[4] + status_msg + EXT_PRESENCE[5]);
    }
    self.leave_room = function() {
        self.send(construct(PRESENCE, [full_jid, room_jid, 'unavailable']));
    }
    self.groupchat_msg = function(content) {
        self.send(construct(GROUPCHAT_MSG, [full_jid, room_id, content]));
    }
    self.set_presence = function(status, status_msg) {
        self.send(EXT_PRESENCE[0] + full_jid + EXT_PRESENCE[1] + room_jid + EXT_PRESENCE[3] + status + EXT_PRESENCE[4] + status_msg + EXT_PRESENCE[5]);
    }
    // end support for MUC
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
        conn.open(host, port, false);
    }
    // added stamp to messages, support for old and new protocol
    // added show/status to presence
    var nodeReceived = function(node) {
        if (!node) { // for IE - necessary?
            return;
        }
        if (node.nodeName == "message") {
            var from = node.getAttribute("from");
            var c = node.childNodes;
            var body = null
            var stamp = null;
            for (var i = 0; i < c.length; i++) {
                if (c[i].nodeName == "body")
                    body = parser.text(c[i]);
                else if (c[i].nodeName == "delay" || (c[i].nodeName == "x" && c[i].getAttribute("xmlns") == "jabber:x:delay"))
                    stamp = c[i].getAttribute("stamp");
            }
            if (body)
                self.onMessage(from, from, body, stamp);
        }
        else if (node.nodeName == "presence") {
            var ntype = node.getAttribute("type");
            var from = node.getAttribute("from");
            var to = node.getAttribute("to");
            var show = null;
            var status = null;
            var c = node.childNodes;
            for (var i = 0; i < c.length; i++) {
                if (c[i].nodeName == "show")
                    show = parser.text(c[i]);
                else if (c[i].nodeName == "status")
                    status = parser.text(c[i]);
            }
            self.onPresence(ntype, from, to, show, status);
        }
        else
            self.onUnknownNode(node);
    }
    var setDomain = function(s) {
        if (s.indexOf("host-unknown") != -1) {
            if (failure) {failure();}
        }
        else {
            if (success) {success();}
        }
    }
    var regUser = function(s) {
        if (s.indexOf("conflict") != -1) {
            if (failure) {failure();}
        }
        else {
            conn.onread = parser.read;
            if (success) {success();}
        }
    }
    var setUser = function(s) {
        if (s.indexOf("not-authorized") != -1) {
            if (failure) {failure();}
        }
        else {
            conn.onread = parser.read;
            self.send(construct(ROSTER, [full_jid]));
            if (success) {success();}
        }
    }
    var close = function(code) {
        reconnect();
    }
}

js.io.declare('js.io.protocols.xmpp.Client',XMPPClient,{});
