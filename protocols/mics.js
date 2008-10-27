/**********************************
* author: Mario Balibrera
*    web: mariobalibrera.com
*  email: mario.balibrera@gmail.com
**********************************/

js.io.require('js.io.tools.io.xmlreader');
js.io.provide('js.io.protocols.mics');

function MICSClient() {
    var self = this;
    var conn = null;
    var cbs = {};
    var switch_time = null;
    var reader = new js.io.tools.io.xmlreader.Reader();
    var parse_event = function(node) {
        if (node.nodeName in cbs) {
            cb = cbs[node.nodeName];
            switch (node.nodeName) {
                case 'chat':
                    var n = node.getAttribute('name');
                    var m = node.firstChild.data;
                    cb(n, m);
                    break;
                case 'confirm':
                    cb();
                    break;
                case 'draw':
                    cb();
                    break;
                case 'game':
                    var c = node.getAttribute('color');
                    var ini = node.getAttribute('initial');
                    var inc = node.getAttribute('increment');
                    cb(c, ini, inc);
                    break;
                case 'gameover':
                    var outcome = node.getAttribute('outcome');
                    var reason = node.getAttribute('reason');
                    cb(outcome, reason);
                    break;
                case 'list':
                    for (var i=0;i<node.childNodes.length;i++) {
                        var n = node.childNodes[i];
                        var name = i.getAttribute('name');
                        var ini = parseInt(n.getAttribute('initial'));
                        var inc = parseInt(n.getAttribute('increment'));
                        cb(name, ini, inc);
                    }
                    break;
                case 'move':
                    received();
                    if (switch_time) { switch_time(); }
                    var f = node.getAttribute('from');
                    var t = node.getAttribute('to');
                    var p = null;
                    if (node.hasAttribute('promotion')) {
                        p = node.getAttribute('promotion');
                    }
                    cb(f, t, p);
                    break;
                case 'notice':
                    cb(node.firstChild.data);
                    break;
                case 'time':
                    var w = parseFloat(node.getAttribute('white'));
                    var b = parseFloat(node.getAttribute('black'));
                    cb(w, b);
                    break;
            }
        }
        else {
            alert("client incomplete. assign callback for "+node.nodeName+" frame.");
        }
    }
    var received = function() {
        send("<received/>");
    }
    var send = function(data) {
        if (conn) {
            conn.send(data);
        }
        else {
            alert("you haven't called MICSClient.connect, so you can't send this data: "+data);
        }
    }
    var on_connect = function() {
        if ('notice' in cbs) {
            cbs['notice']('connection established');
        }
    }
    var on_close = function() {
        if ('notice' in cbs) {
            cbs['notice']('connection lost');
        }
    }
    self.connect = function(host, port) {
        reader.set_cb(parse_event);
        conn = new js.io.TCPSocket();
        conn.onread = reader.read;
        conn.onopen = on_connect;
        conn.onclose = on_close;
        conn.open(host, port, false);
    }
    self.set_cb = function(frame, cb) {
        cbs[frame] = cb;
    }
    self.set_timechange_cb = function(cb) {
        switch_time = cb;
    }
    self.read = function(data) {
        reader.read(data);
    }
    self.chat = function(msg) {
        send("<chat>"+msg+"</chat>");
    }
    self.draw = function() {
        send("<draw/>");
    }
    self.forfeit = function() {
        send("<forfeit/>");
    }
    self.list = function() {
        send("<list/>");
    }
    self.move = function(from, to, promotion) {
        var m = "<move from='"+from+"' to='"+to+"' gameover='check'";
        if (promotion) {
            m += " promotion='"+promotion+"'";
        }
        m += "/>";
        send(m);
    }
    self.seek = function(name, initial, increment) {
        send("<seek name='"+name+"' initial='"+initial+"' increment='"+increment+"'/>");
    }
    self.timeout = function() {
        send("<timeout/>");
    }
}

js.io.declare('js.io.protocols.mics.Client',MICSClient,{});
