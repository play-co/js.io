IRCClient = function() {
    var self = this;
    var conn = null;
    
    self.nickname = ""
    
    self.onident = function() {
    }
    self.onconnect = function() {

    }
    // DEFAULT CALLBACKS
    self.onnames = function(names) {}// print(names) }
    self.onmessage = function(n,msg) {}// print(msg) }
    self.onjoin = function(n) {}// print("<b>" + n + " has joined</b>") }
    self.onpart = function(n,msg) {}// print("<b>" + n + " has quit (parted)</b>") }
    self.onquit = function(n,msg) {}// print("<b>" + n + " has quit</b>") }
    self.onaction = function(n,a) {}
    self.onclose = function() {}//print("closed connection")}

    self.connect = function(host, port) {
        conn = new self.transport(host, port)
        conn.onread = read
        conn.onopen = open
        conn.onclose = close
    }
    self.nick = function(nickname) {
        self.nickname = nickname
        send("NICK " + nickname + "\r\n")
    }
    self.ident = function(ident, modes, name) {
        send("USER " + ident + " " + modes + " :" + name + "\r\n")
    }
    self.join = function(channel) {
        send('JOIN ' + channel + '\r\n')
    }
    self.quit = function() {
        send('QUIT :leaving')
        self.onclose()
        //FIXME: clean up tcp connection
    }
    self.names = function(channel) {
        send('WHO ' + channel)
    }
    self.privmsg = function(dest, message) {
        self.onmessage(self.nickname, message)
        send('PRIVMSG ' + dest + ' :' + message + '\r\n')    
    }
    
    var read = function(data) {
        //data = bytesToUTF8(data)
        
        var msgs = data.split("\r\n")
        for (var i=0; i<msgs.length; i++)
            dispatch(msgs[i])
    }
    
    var parse_name = function(identity) {
        return identity.split("!",1)[0]
    }
    
    var dispatch = function(msg) {
        var parts = msg.split(" ")
        
        if (parts[1] == "JOIN") {
            var identity = parts[0].slice(1)
            var ident_name = parse_name(identity)
            self.onjoin(ident_name)
        }
        else if (parts[1] == "QUIT") {
            var identity = parts[0].slice(1)
            var ident_name = parse_name(identity)
            var message = parts.slice(2).join(' ').slice(1)
            self.onquit(ident_name, message)
        }
        else if (parts[1] == "PART") {
            var identity = parts[0].slice(1)
            var ident_name = parse_name(identity)
            var message = parts.slice(3).join(' ').slice(1)
            self.onpart(ident_name, message)
        }
        else if (parts[1] == "PRIVMSG" && parts[2] != self.nickname) {
            var identity = parts[0].slice(1)
            var ident_name = parse_name(identity)
            var message = parts.slice(3).join(" ").slice(1)
            self.onmessage(ident_name, message)
        }       
        
        
        else if (parts[3] == "@" || parts[3] == "=") {
            var namelist = msg.split(":").slice(-1)[0].split(" ")
        
            self.onnames(namelist)
        }
        
        if (parts[0] == "PING") {
            send(msg.replace("PING","PONG") + '\r\n')
        }
        

    }
    var open = function(evt) {
        self.onident();
    }
    var close = function(evt) {

    }

    var send = function(s) {
        //conn.send(UTF8ToBytes(s))
        conn.send(s)
    }
}

IRCClient.prototype.transport = TCPSocket
