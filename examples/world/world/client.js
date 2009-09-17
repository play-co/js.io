require('jsio', ['Class', 'bind'])
require('jsio.protocols.rtjp', ['RTJPProtocol'])
require('jsio.logging')

var logger = jsio.logging.getLogger('world.client')

var Player = Class(function() {
	this.init = function(username, x, y) {
		this.username = username;
		this.x = x;
		this.y = y;
		this._x = null;
		this._y = null;
		this.dir = 'down';
		this.el = $.create({
			className: 'player', 
			style: {
				width: gPlayerDim + 'px',
				height: gPlayerDim + 'px'
			},
			parent: gBoardEl
		});
		
		this.text = $.create({
			className: 'msg',
			parent: gBoardEl
		});
		
		this.name = $.create({
			className: 'name',
			parent: gBoardEl,
			text: username.substring(0, 14)
		});
	}
	
	this.say = function(text) {
	    if(!text) { text = ''; }
		if(text.length > 140) {
			text = text.substring(0, 140) + '...';
		}
		$.setText(this.text, text);
	}
	
	this.move = function(x, y) {
		this.x = x;
		this.y = y;
		
		if(this._y === null) {
			this._x = x;
			this._y = y;
		}
		
		this.update();
	}
	
	this.update = function() {
		if(this._x != this.x || this._y != this.y) {
			var dx = this.x - this._x;
			var dy = this.y - this._y;
			var adx = Math.abs(dx);
			var ady = Math.abs(dy);
			if(adx > ady) {
				this.dir = dx > 0 ? 'right' : 'left';
			} else {
				this.dir = dy >= 0 ? 'down' : 'up'; 
			}
						
			if(dx * dx + dy * dy < 1) {
				this._x = this.x;
				this._y = this.y;
			} else if(adx > ady) {
				this._x += this._x < this.x ? 1 : -1;
				this._y += this._y < this.y ? ady / adx : -ady / adx;
			} else {
				this._y += this._y < this.y ? 1 : -1;
				this._x += this._x < this.x ? adx / ady : -adx / ady;
			}
		}

		$.style(this.el, {
			top: this._y + 'px',
			left: this._x + 'px',
			backgroundPosition: gSprite[this.dir][0] + 'px ' + gSprite[this.dir][1] + 'px'
		});
		
		$.style(this.text, {
			top: this._y - 15 + 'px',
			left: this._x + 25 + 'px'
		});
		
		$.style(this.name, {
			top: this._y + 20 + 'px',
			left: this._x + 'px'
		});
	}
	
	this.destroy = function() {
		// TODO: fade out
		if(this.el.parentNode) {
			this.el.parentNode.removeElement(this.el);
		}
	}
});

exports.WorldClient = Class(RTJPProtocol, function(supr) {
    this.init = function(username, avatarUrl) {
        supr(this, "init", []);
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

    this.onWelcome = function(presence) {
	try {
        for(var i = 0, p; p = presence[i]; ++i) {
            this.onJoin(p.username, p.url);
            this.onMove(p.username, p.x, p.y);
            this.onSay(p.username, p.msg);
        }
	} catch(e) { }
	this.timer = setInterval(bind(this, this.beat), 10000);
    }


    this.onMove = function(username, x, y) {
		this.players[username].move(x, y);
	}
	
    this.onSay = function(username, msg) {
		this.players[username].say(msg);
	}
	
	this.onJoin = function(username, url) {
		if(!(username in this.players)) {
			this.players[username] = new Player(username);
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
	
        this.beat = function() {
	    this.sendFrame('BEAT', {});
        }

	// Callbacks
	this.frameReceived = function(id, name, args) {
		logger.debug('frameReceived', id, name, args);
		switch(name) {
            case 'WELCOME':
                this.onWelcome(args.presence);
                break;
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
        var x = Math.floor(Math.random() * 480) + 10;
        var y = Math.floor(Math.random() * 480) + 10;
		this.sendFrame('LOGIN', {'username':this.username, url: this.avatarUrl, x: x, y:y});
        this.move(x,y);
	}
	
	this.connectionLost = function() {
		logger.debug('disconnected!');
		clearInterval(this.timer);
	}
});
