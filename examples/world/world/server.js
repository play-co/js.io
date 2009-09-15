require('jsio', ['Class', 'bind'])
require('jsio.interfaces', ['Server'])
require('jsio.protocols.rtjp', ['RTJPProtocol'])
require('jsio.logging')

var logger = jsio.logging.getLogger('world.server')

var kBounds = [[0,0], [500,500]];


exports.WorldServer = Class(Server, function(supr) {
    this.init = function() {
        supr(this, 'init', [WorldConnection]);
        this.players = {}
    };

    this.broadcast = function(fName, fArgs, omit) {
        for (name in this.players) {
            var conn = this.players[name];
            if (conn === omit) { continue }
            conn.sendFrame(fName, fArgs);
        }
    };

    this.join = function(conn, username, url) {
        if (username in this.players) {
            throw new Error("player already taken");
        }
        this.broadcast('JOIN', {username: username, url:url});
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
        this.broadcast('MOVE', {username:conn.username, x:x, y:y});
    };

})

var WorldConnection = Class(RTJPProtocol, function(supr) {
    this.frameReceived = function(id, name, args) {
        logger.debug('frameReceived', id, name, JSON.stringify(args));
        switch(name) {  
            case 'LOGIN':
                if (this.username) {
                    this.sendFrame('ERROR', {msg: 'Already logged in'});
                    break;
                }
                try {
                    this.server.join(this, args.username, args.url);
                    this.username = args.username;
                    this.sendFrame('WELCOME', {})
                } catch(e) {
                    this.sendFrame('ERROR', {msg: e.toString()})
                }
                break;
            case 'SAY':
                this.server.say(this, args.msg);
                break;
            case 'MOVE':
                if (args.x < kBounds[0][0] || args.x > kBounds[1][0] || args.y < kBounds[0][1] || args.y > kBounds[1][1]) {
                    this.sendFrame('ERROR', {msg: 'Out of bounds'});
                    break;
                }
                this.server.move(this, args.x, args.y);
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