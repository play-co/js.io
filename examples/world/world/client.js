require('jsio', ['Class', 'bind'])
require('jsio.protocols.rtjp', ['RTJPProtocol'])
require('jsio.logging')

var logger = jsio.logging.getLogger('world.client')


exports.WorldClient = Class(RTJPProtocol, function(supr) {
    this.init = function(username, avatarUrl) {
        supr(this, "init", []);
        this.username = username;
        this.avatarUrl = avatarUrl;
    }

    // Public api

    this.onMove = function(username, x, y) { }
    this.onSay = function(username, msg) { }
    this.onJoin = function(username, url) { }
    this.onLeave = function(username) { }
    this.onError = function(msg) { }

    this.move = function(x,y) {
        this.sendFrame('MOVE', {x:x, y:y});
    }

    this.say = function(msg) {
        this.sendFrame('SAY', {msg: msg});
    }

    // Callbacks
    this.frameReceived = function(id, name, args) {
        logger.debug('frameReceived', id, name, args);
        switch(name) {
            case 'SAY':
                this.onSay(args.username, args.msg);
                break;
            case 'MOVE':
                this.onMove(args.username, args.x, args.y);
                break;
            case 'JOIN':
                this.onJoin(args.username, args.url);
                break;
            case 'LEAVE':
                this.onLeave(args.username);
                break;
            case 'ERROR':
                this.onError(args.msg);
                break;
            default:
                break;
        }
    }
    this.connectionMade = function() {
        logger.debug('connected!');
        this.sendFrame('LOGIN', {'username':this.username, url: this.avatarUrl});
    }
    this.connectionLost = function() {
        logger.debug('disconnected!');
    }

})