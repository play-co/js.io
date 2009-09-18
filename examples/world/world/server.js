require('jsio', ['Class', 'bind']);
require('jsio.interfaces', ['Server']);
require('jsio.protocols.rtjp', ['RTJPProtocol']);
require('jsio.logging');
require('.constants', '*');

var logger = jsio.logging.getLogger('world.server');

exports.WorldServer = Class(Server, function(supr) {
	this.init = function() {
		supr(this, 'init', [WorldConnection]);
		this.players = {};
		this.history = [];
	};

	this.broadcast = function(fName, fArgs, sender) {
		for (name in this.players) {
			var conn = this.players[name];
			if (conn === sender) { continue; }
			conn.sendFrame(fName, fArgs);
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
		var line = {username:conn.username, msg:msg, ts:+new Date()};
		this.history.push(line);
		if(this.history.length > 100) {
			this.history.shift();
		}
		this.broadcast('SAY', line, conn);
	};
	
	this.move = function(conn, x,y) {
		this.broadcast('MOVE', {username:conn.username, x:x, y:y}, conn);
	};
});

var WorldConnection = Class(RTJPProtocol, function(supr) {

	this.connectionMade = function() {
		supr(this, 'connectionMade', []);
		logger.debug('connectionMade');
	}

	this.frameReceived = function(id, name, args) {
		logger.debug('frameReceived', id, name, JSON.stringify(args));
		
		// this frame is allowed without a username
		if(name == 'LOGIN') {
			if (this.username) {
				this.sendFrame('ERROR', {msg: 'Already logged in'});
				break;
			}

			try {
				this.server.join(this, args.username, args.url, args.x, args.y);
				this.username = args.username;
				this.x = args.x;
				this.y = args.y;
				
				var presence = [];
				for (var username in this.server.players) {
					var conn = this.server.players[username];
					presence.push({
						username: username,
						x: conn.x,
						y: conn.y,
						url: conn.url,
						msg: conn.msg
					});
				}
				
				this.sendFrame('WELCOME', {
					presence: presence,
					history: this.server.history
				});
				
			} catch(e) {
				this.sendFrame('ERROR', {msg: e.toString()});
			}
		}
		
		// make sure users can't send frames if they're not logged in
		if(!this.username) { return; }
		
		switch(name) {
			case 'SAY':
				this.server.say(this, args.msg);
				this.msg = args.msg;
				break;
			case 'MOVE':
				if (args.x < kBounds.minX || args.x > kBounds.maxX
					|| args.y < kBounds.minY || args.y > kBounds.maxY)
				{
					this.sendFrame('ERROR', {msg: 'Out of bounds'});
					break;
				}
				this.server.move(this, args.x, args.y);
				this.x = args.x;
				this.y = args.y;
				break;
			default:
				break;
		}
	}

	this.connectionLost = function() {
		logger.info('connectionLost!', this.username);
		if (this.username) {
			this.server.leave(this);
		}
	}

})
