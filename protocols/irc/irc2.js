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
 *          set onPRIVMSG = function(command) {...you code here...}
 *      See the included IRC demo (/static/demos/irc) for example usage
 *
 * Frank Salim (frank.salim@gmail.com)
 * ©2008 The Orbited Project
 */

// TODO DRY this by creating a common logging infrastructure (this is also on stomp.js)
IRC_DEBUG = false;

if (IRC_DEBUG && typeof(console)) {
    function getIrcLogger(name) {
        return {
            debug: function() {
                var args = Array.prototype.slice.call(arguments);
                args.unshift(name, ": ");
                console.debug.apply(console, args);
            },
            dir: function() {
                console.debug(name, ":");
                console.dir.apply(console, arguments);
            }
        };
    }
} else {
    function getIrcLogger(name) {
        return {
            debug: function() {},
            dir: function() {}
        };
    }
}

IRCClient = function() {
    var log = getIrcLogger("IRCClient");
    var self = this
    var conn = null
    var buffer = ""
    var ENDL = "\r\n"

    self.onopen = function() {};
    self.onconnect = function() {}      // Do nothing in default callbacks
    self.onclose = function() {}
    self.onerror = function(command) {}
    self.onresponse = function(command) {}     // used for numerical replies
                            
    self.connect = function(hostname, port) {
        log.debug("connect");
        conn = self._createTransport();
        conn.onopen = conn_opened
        conn.onclose = conn_closed
        conn.onread = conn_read
        conn.open(hostname, port)
        // TODO set onerror.
    }
    self._createTransport = function() {
        return new TCPSocket();
    };
    self.close = function() {
        log.debug("close");
        // XXX there is no TCPSocket.close method... so I'm removing all
        //     the listeners here (until this is fixed).
        //conn.close()
        conn.onopen = null;
        conn.onclose = null;
        conn.onread = null;
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
        var reason = reason || "leaving";
        send("QUIT", ":" + reason)
        // XXX there is no TCPSocket.close method... YET!
        //     but sending a QUIT should make the IRCD close
        //     the connection too...
        //conn.close()
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
        log.debug("data:");
        log.debug(data);
        buffer += data
        parse_buffer()
    }

    // Internal Functions
    var send = function(type, payload) {
        conn.send(type + " " + payload + ENDL)
    }
    var parse_buffer= function() {
        var commands = buffer.split(ENDL);
        buffer = commands[commands.length-1];
        for (var i = 0, l = commands.length - 1; i < l; ++i) {
            var line = commands[i];
            if (line.length > 0)
                dispatch(line);
        }
    };
    var parse_command = function(s) {
        // See http://tools.ietf.org/html/rfc2812#section-2.3

        // all the arguments are split by a single space character until
        // the first ":" character.  the ":" marks the start of the last
        // trailing argument which can contain embeded space characters.
        var i = s.indexOf(" :");
        if (i >= 0) {
            var args = s.slice(0, i).split(' ');
            args.push(s.slice(i + 2));
        } else {
            var args = s.split(' ');
        }

        // extract the prefix (if there is one).
        if (args[0].charAt(0) == ":") {
          var prefix = args.shift().slice(1);
        } else {
          var prefix = null;
        }

        var command = {
            prefix: prefix,
            type: args.shift(),
            args: args
        };
        log.debug("command:");
        log.dir(command);
        return command;
    };
    var dispatch = function(line) {
        command = parse_command(line);
        
        if (command.type == "PING") {
            send("PONG", ":" + command.args)
        } else if (!isNaN(parseInt(command.type))) {
            var error_code = parseInt(command.type)
            if (error_code > 400)
                self.onerror(command)
            else
                self.onresponse(command)
        } else if (typeof(self["on" + command.type]) == "function") {
            // XXX the user is able to define unknown command handlers,
            //     but cannot send any arbitrary command
            self["on" + command.type](command);
        } else {
            log.debug("unhandled command received: ", command.type);
        }
    };
};
