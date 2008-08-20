CONNECT = ["<stream:stream to='","' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams'>"];
REGISTER = ["<iq type='set'><query xmlns='jabber:iq:register'><username>","</username><password>","</password></query></iq>"];
LOGIN = ["<iq type='set'><query xmlns='jabber:iq:auth'><username>","</username><password>","</password><resource>Orbited</resource></query></iq>"];
ROSTER = ["<iq from='","' type='get'><query xmlns='jabber:iq:roster'/></iq><presence/>"];
MSG = ["<message from='","' to='","' xml:lang='en' type='chat'><body>","</body></message>"];
PRESENCE = ["<presence from='","' to='","' type='","'/>"];

XMLStreamParser = function() {
    var self = this;
    var buffer = ""
    var parser=new DOMParser();

    self.onread = function(node) { }

    self.receive = function(data) {
        buffer += data
        parseBuffer()
    }

    var parseBuffer = function() {
        while (true) {
            var tagOpenStartIndex = buffer.indexOf('<')
            var tagOpenEndIndex = buffer.indexOf('>', tagOpenStartIndex)
            if (tagOpenEndIndex == -1) {
                return
            }
            var endTagNameIndex = Math.min(buffer.indexOf(' ', tagOpenStartIndex), tagOpenEndIndex)
            
            var tagName = buffer.slice(tagOpenStartIndex+1, endTagNameIndex)
            var nodePayload = ""
            // Allows detection of self contained tags like "<tag />"
            // TODO: don't make whitespace count. allow "<tag /  >"
            //       (is that valid xml?)
            if (buffer[tagOpenEndIndex-1] == '/') {
                nodePayload = buffer.slice(tagOpenStartIndex, tagOpenEndIndex+1)
            }
            else {
                var endTag = '</' + tagName + '>'
                var endTagIndex = buffer.indexOf(endTag)
                if (endTagIndex== -1) {
                    return
                }
                var nodePayload= buffer.slice(tagOpenStartIndex, endTagIndex + endTag.length)
            }
            var rootNode =parser.parseFromString(nodePayload,"text/xml");
            buffer = buffer.slice(tagOpenStartIndex + nodePayload.length)
            self.onread(rootNode.childNodes[0]);
        }
    }
}

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
    var parser = new XMLStreamParser();
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
//        console.log("sent: "+s);
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
        conn = new self.transport();
        conn.onread = setDomain;
        conn.onopen = self.onSocketConnect;
        conn.onclose = close;
        parser.onread = nodeReceived;
        conn.open(host, port, true);
//        console.log("connection opened");
    }
    var nodeReceived = function(node) {
//        console.log("received node: "+node.nodeName);
//        var a = node.attributes;
//        for (var i = 0; i < a.length; i++) {
//            console.log("   " + a[i].localName + ": " + a[i].value);
//        }
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
//        console.log('received: '+s);
        parser.receive(s);
    }
    var setDomain = function(evt) {
        var s = Orbited.utf8.decode(evt);
//        console.log('setDomain received: '+s);
        if (s.indexOf("host-unknown") != -1) {
            if (failure) {failure();}
        }
        else {
            if (success) {success();}
        }
    }
    var regUser = function(evt) {
        var s = Orbited.utf8.decode(evt);
//        console.log('regUser received: '+s);
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
//        console.log('setUser received: '+s);
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
//        console.log("connection closed");
        reconnect();
    }
}
XMPPClient.prototype.transport = TCPSocket;
