require('jsio', ['Class', 'bind'])
require('jsio.interfaces', ['Server'])
require('jsio.protocols.rtjp', ['RTJPProtocol'])
require('jsio.logging')

var logger = jsio.logging.getLogger('world.server')

var kBounds = [[0,0], [640,480]];


exports.WorldServer = Class(Server, function(supr) {
    this.init = function() {
        supr(this, 'init', [WorldConnection]);
        this.players = {}
    };

    this.broadcast = function(fName, fArgs, omit) {
        var leavers = [];
        for (name in this.players) {
            var conn = this.players[name];
            if (conn === omit) { continue }
	    try {
		conn.sendFrame(fName, fArgs);
	    } catch(e) {
		leavers.push(conn);
	    }
	    for (var i = 0, leaver; leaver=leavers[i]; ++i) {
		this.leave(leaver);
	    }
        }
    };

    this.join = function(conn, username, url,x ,y) {
        if (username in this.players) {
            throw new Error("player already taken");
        }
        this.broadcast('JOIN', {username: username, url:url, x:x, y:y});
        this.players[username] = conn;
    };

    this.leave = function(conn) {
        delete this.players[conn.username];
        this.broadcast('LEAVE', {username: conn.username});
    };

    this.say = function(conn, msg) {
        this.broadcast('SAY', {username:conn.username, msg:msg}, conn);
    };
    
    this.move = function(conn, x,y) {
        this.broadcast('MOVE', {username:conn.username, x:x, y:y}, conn);
    };

})

var WorldConnection = Class(RTJPProtocol, function(supr) {

    this.connectionMade = function() {
        supr(this, 'connectionMade', []);
        logger.debug('connectionMade');
    }

    this.frameReceived = function(id, name, args) {
        logger.debug('frameReceived', id, name, JSON.stringify(args));
        switch(name) {  
            case 'LOGIN':
                if (this.username) {
                    this.sendFrame('ERROR', {msg: 'Already logged in'});
                    break;
                }
                try {
                
                    this.server.join(this, args.username, args.url, args.x, args.y);
                    this.username = args.username;
                    this.x = args.x;
                    this.y = args.y;
                    var presence = []
                    for (var username in this.server.players) {
                        var conn = this.server.players[username];
                        presence.push({username:username, x:conn.x, y:conn.y, url: conn.url, msg: conn.msg})
                    }
		    this.sendFrame('WELCOME', {presence:presence})
                } catch(e) {
                    this.sendFrame('ERROR', {msg: e.toString()})
                }

                break;
            case 'SAY':
                this.server.say(this, args.msg);
                this.msg = args.msg;
                break;
            case 'MOVE':
                if (args.x < kBounds[0][0] || args.x > kBounds[1][0] || args.y < kBounds[0][1] || args.y > kBounds[1][1]) {
                    this.sendFrame('ERROR', {msg: 'Out of bounds'});
                    break;
                }
                this.server.move(this, args.x, args.y);
		this.x = args.x;
		this.y = args.y;
                break;
            default:
            this.sendFrame(name, args);
        }
    }

    this.connectionLost = function() {
        if (this.username) {
            this.server.leave(this);
        }
    }

})