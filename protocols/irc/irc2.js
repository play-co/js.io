/* irc.js
 *  This IRC client runs in a web browser using pure JavaScript
 *  Orbited 0.5+ required
 *
 *  Methods:
 *      connect(hostname, port)
 *      ident(nickname, modes, real_name)
 *      join(channel)
 *      names(channel)
 *      part(channel)
 *      quit(reason)
 *      privmsg(destination, message)
 *
 *  Callbacks:
 *      Built-in callbacks are onconnect(), onerror(), onresponse(), and onclose()
 *      onerror and onreply are passed numerical reponse codes, see:
 *      http://www.irchelp.org/irchelp/rfc/chapter6.html for a list of IRC response
 *      codes.
 *
 *      To add callbacks for IRC actions, for instance PRIVMSG,
 *          set onPRIVMSG = function(args) {...you code here...}
 *      See the included IRC demo (/static/demos/irc) for example usage
 *
 * Frank Salim (frank.salim@gmail.com)
 * ©2008 The Orbited Project
 */

IRCClient = function() {
    var self = this
    var conn = null
    var buffer = ""
    var ENDL = "\r\n"

    self.onconnect = function() {}      // Do nothing in default callbacks
    self.onclose = function() {}
    self.onerror = function(msg) {}
    self.onresponse = function(msg) {}     // used for numerical replies
                            
    self.connect = function(hostname, port) {
        conn = new self.transport(hostname, port)
        conn.onopen = conn_opened
        conn.onclose = conn_closed
        conn.onread = conn_read
    }
    self.close = function() {
        conn.close()
        self.onclose()
    }
    self.ident = function(nickname, modes, real_name) {
        send("USER", nickname + " " + modes + " :" + real_name) 
    }
    self.nick = function(nickname) {
        send("NICK", nickname)
    }
    self.join = function(channel) {
        send("JOIN", channel)
    }
    self.names = function(channel) {
        send("NAMES", channel)
    }
    self.part = function(channel, reason) {
        send("PART", channel + " :" + reason)
    }
    self.quit = function(reason) {
        send("QUIT", ":" + reason)
        conn.close()
    }
    self.privmsg = function(destination, message) {
        send('PRIVMSG', destination + ' :' + message)
    }

    // Socket Callbacks
    var conn_opened = function() {
        self.onopen()
    }
    var conn_closed = function() {
        self.onclose()
    }
    var conn_read = function(data) {
        buffer += data
        parse_buffer()
    }

    // Internal Functions
    var send = function(type, payload) {
        conn.send(type + " " + payload + ENDL)
    }
    var parse_buffer= function() {
        var msgs = buffer.split(ENDL)
        buffer = msgs[msgs.length-1]
        for (var i=0; i<msgs.length-1; i++)
            dispatch(msgs[i])
    }
    var parse_message = function(s) {        
        var msg = {}
        msg.prefix = ""
        if (s[0] == ":") {
            var first_space = s.search(" ")
            msg.prefix = s.slice(0, first_space).slice(1)
            s = s.slice(first_space + 1)
        }
        if (s.search(':') != -1) {
            var i = s.search(":")
            var payload = s.slice(i+1)
            s = s.slice(0,i-1)
            msg.args = s.split(' ')
            msg.args.push(payload)
        } else {
            msg.args = s.split(' ')
        }
        msg.type = msg.args.shift()
        return msg
    }
    var dispatch = function(line) {
        msg = parse_message(line)
        
        if (msg.type == "PING") {
            send("PONG", ":" + msg.args)
        } else if (!isNaN(parseInt(msg.type))) {
            var error_code = parseInt(msg.type)
            if (error_code > 400)
                self.onerror(msg)
            else
                self.onresponse(msg)
        } else if (typeof(self["on" + msg.type]) == "function") {
            self["on"+msg.type](msg.args)
        } else {
            console.log(msg)
        }
    }
}

IRCClient.prototype.transport = TCPSocket
