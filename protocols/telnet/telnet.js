//telnet.js

TelnetClient = function() {
    var self = this
    var conn = null
    var buffer = ""
    var ENDL = "\r\n"
    
    // Public callbacks
    self.onopen = function() {}
    self.onmessage = function() {}
    self.onclose = function(code) {}
    
    
    // Public methods: connect, nick, ident, names, join, quit
    self.connect = function(host, port) {
        conn = new self.transport();
        // Set socket callbacks
        conn.onread = read
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
    var read = function(s) {
        buffer += s
        parse_buffer()
    }
    var open = function() {
        self.onopen()
    }
    var close = function(code) {
        self.onclose(code)
    }
    
    // Message parsing and dispatching
    var parse_buffer = function() {
        var msgs = buffer.split("\n")
        buffer = ""

        // Dispatch any lines in the buffer
        for (var i=0; i< msgs.length; i++)
            dispatch(msgs[i])
    }
    var dispatch = function(msg) {
        self.onmessage(msg)
    }
}

TelnetClient.prototype.transport = TCPSocket
