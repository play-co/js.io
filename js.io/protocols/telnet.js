//telnet.js

js.io.require('js.io.tools.io.delimiter');
js.io.provide('js.io.protocols.telnet');

TelnetClient = function() {
    var self = this
    var conn = null
    var reader = null
    var ENDL = "\r\n"

    // Public callbacks
    self.onopen = function() {}
    self.onmessage = function() {}
    self.onclose = function(code) {}


    // Public methods: connect, nick, ident, names, join, quit
    self.connect = function(host, port) {
        reader = new js.io.tools.io.delimiter.Reader()
	reader.set_cb(dispatch)
	reader.set_delim(ENDL)
	conn = new js.io.TCPSocket();
        // Set socket callbacks
        conn.onread = reader.read
        conn.onclose = close
        conn.onopen = open
        conn.open(host, port);
    }
    self.close = function() {
        conn.close()
    }
    self.send = function(s) {
        send(s + ENDL)
    }


    // Socket functions: send, read, open, and close
    var send = function(s) {
        // If we were going to use UTF8ToBytes, this would be the place
        conn.send(s)
    }
    var open = function() {
        self.onopen()
    }
    var close = function(code) {
        self.onclose(code)
    }

    // Message dispatching
    var dispatch = function(msg) {
        self.onmessage(msg)
    }
}

js.io.declare('js.io.protocols.telnet.Client',TelnetClient,{});