jsio('import Class, bind');
jsio('import jsio.logging');
jsio('from jsio.interfaces import PubSub');
jsio('from jsio.protocols.rtjp import RTJPProtocol');

var logger = jsio.logging.getLogger('world.client');
logger.setLevel(0);

exports.WorldProtocol = Class([RTJPProtocol, PubSub], function(supr) {
    this.init = function(playerFactory, username, avatarUrl) {
        supr(this, 'init');
		this.playerFactory = playerFactory;
        this.username = username;
        
        this.avatarUrl = avatarUrl;
		this.players = {};

		this.onJoin({
			username: this.username,
			url: avatarUrl
		});
		this.self = this.players[this.username];
		this._update = bind(this, 'update');
    }
	
	this.update = function() {
		var again = false;
		for(var username in this.players) {
			again |= this.players[username].update();
		}
		this.interval = again ? setTimeout(this._update, 25) : null;
	}
	
    // Public api

    this.onWelcome = function(presence, history) {
        for(var i = 0, p; p = presence[i]; ++i) {
            this.onJoin(p);
        }
		if(!this.interval) { this.update(); }
    }

    this.onMove = function(username, x, y) {
		this.players[username].move(x, y);
		if(!this.interval) { this.update(); }
	}
	
    this.onSay = function(params) {
		this.players[params.username].say(params.msg, params.ts);
		this.publish('say', params, this.players[params.username].color);
	}
	
	this.onJoin = function(params) {
		if(!(params.username in this.players)) {
			this.players[params.username] = this.playerFactory(params);
			if(!this.interval) { this.update(); }
		}
	}
	
	this.onLeave = function(username) {
		this.players[username].destroy();
		delete this.players[username];
	}
	
	this.onError = function(msg) {
		alert(msg);
	}
	
	this.move = function(x,y) {
		this.self.move(x, y);
		if(!this.interval) { this.update(); }
		
		try {
			this.sendFrame('MOVE', {x:x, y:y});
		} catch(e) {}
	}

	this.say = function(msg) {
		this.self.say(msg);
		this.publish('say', {username: this.username, msg: msg, ts: +new Date(), color: this.self.color})
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
				this.onSay(args);
				break;
			case 'MOVE':
				this.onMove(args.username, args.x, args.y);
				break;
			case 'JOIN':
				this.onJoin(args);
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
		this.sendFrame('LOGIN', {
			username: this.username,
			url: this.avatarUrl,
			x: this.self.x,
			y: this.self.y,
			color: this.self.color
		});
	}
	
	this.connectionLost = function() {
		alert('oops, the connection was lost');
		window.location.replace();
	}
});
