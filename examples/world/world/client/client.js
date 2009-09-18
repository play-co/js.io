require('jsio', ['Class', 'bind']);
require('jsio.protocols.rtjp', ['RTJPProtocol']);
require('jsio.logging');
require('jsio.interfaces', 'PubSub');

var logger = jsio.logging.getLogger('world.client');
logger.setLevel(0);

exports.WorldClient = Class([RTJPProtocol, PubSub], function(supr) {
    this.init = function(playerFactory, username, avatarUrl) {
        supr(this, 'init');
		this.playerFactory = playerFactory;
        this.username = username;
        this.avatarUrl = avatarUrl;
		this.players = {};

		setInterval(bind(this, 'update'), 25);

		this.onJoin(this.username, avatarUrl);
		this.self = this.players[this.username];
    }
	
	this.update = function() {
		for(var username in this.players) {
			this.players[username].update();
		}
	}
	
    // Public api

    this.onWelcome = function(presence, history) {
        for(var i = 0, p; p = presence[i]; ++i) {
            this.onJoin(p.username, p.url);
            this.onMove(p.username, p.x, p.y);
            this.onSay(p.username, p.msg);
        }
    }

    this.onMove = function(username, x, y) {
		this.players[username].move(x, y);
	}
	
    this.onSay = function(username, msg, ts) {
		this.players[username].say(msg, ts);
	}
	
	this.onJoin = function(username, url) {
		if(!(username in this.players)) {
			this.players[username] = this.playerFactory(username);
		}
	}
	
	this.onLeave = function(username) {
		this.players[username].destroy();
		delete this.players[username];
	}
	
	this.onError = function(msg) { }
	
	this.move = function(x,y) {
		this.self.move(x, y);
		try {
			this.sendFrame('MOVE', {x:x, y:y});
		} catch(e) {}
	}

	this.say = function(msg) {
		this.self.say(msg);
		try {
			this.sendFrame('SAY', {msg: msg});
		} catch(e) {}
	}
	

	// Callbacks
	this.frameReceived = function(id, name, args) {
		logger.debug('frameReceived', id, name, args);
		switch(name) {
            case 'WELCOME':
                this.onWelcome(args.presence, args.history);
				this.publish('welcome', args.presence, args.history);
                break;
			case 'SAY':
				this.onSay(args.username, args.msg, args.ts);
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
        var x = Math.floor(Math.random() * (kGameWidth - 20)) + 10;
        var y = Math.floor(Math.random() * (kGameHeight - 20)) + 10;
		this.sendFrame('LOGIN', {
			'username': this.username,
			url: this.avatarUrl,
			x: x,
			y: y
		});
		
        this.move(x,y);
	}
	
	this.connectionLost = function() {
		alert('oops, the connection was lost');
		window.location.replace();
	}
});
