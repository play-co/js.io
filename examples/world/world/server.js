jsio('from base import *');
jsio('from net.interfaces import Server');
jsio('from net.protocols.rtjp import RTJPProtocol');
jsio('from .constants import *');

exports.WorldServer = Class(Server, function(supr) {
	this.init = function() {
		supr(this, 'init', [WorldConnection]);
		this.players = {};
		this.history = [];
		
		// for(var i = 0; i < 5000; ++i) {
		// 	var username = 'U' + i;
		// 	this.players[username] = {
		// 		username: username,
		// 		sendFrame:function(){},
		// 		params: {
		// 			username: username,
		// 			x: Math.floor(Math.random() * (kGameWidth - 20)) + 10,
		// 			y: Math.floor(Math.random() * (kGameHeight - 20)) + 10,
		// 			color: {
		// 				r: Math.floor(Math.random() * 128) + 128,
		// 				g: Math.floor(Math.random() * 128) + 128,
		// 				b: Math.floor(Math.random() * 128) + 128
		// 			}
		// 		}
		// 	};
		// }
	};

	this.broadcast = function(fName, fArgs, sender) {
		for (name in this.players) {
			var conn = this.players[name];
			if (conn === sender) { continue; }
			try {
				conn.sendFrame(fName, fArgs);
			} catch(e) {
				logger.warn('Forcing close on disconnected csp connection. FIXME');
				conn.connectionLost();
			}
		}
	};

	this.join = function(conn, params) {
		if (params.username in this.players) {
			throw new Error("player already taken");
		}
		this.broadcast('JOIN', params);
		this.players[params.username] = conn;
	};

	this.leave = function(conn) {
		delete this.players[conn.username];
		this.broadcast('LEAVE', {username: conn.username});
	};

	this.say = function(conn, msg) {
		var line = {username:conn.username, msg:msg, ts:+new Date(), color:conn.params.color};
		this.history.push(line);
		if(this.history.length > 100) {
			this.history.shift();
		}
		
		var player = this.players[conn.username];
		player.params.msg = msg;
		
		this.broadcast('SAY', line, conn);
	};
	
	this.move = function(conn, x, y) {
		
		// update the server x, y of a player so that when people join, they see
		// everyone at their current location rather than their starting location
		var player = this.players[conn.username];
		player.params.x = x;
		player.params.y = y;
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
				return;
			}

			try {
				this.params = {
					username: args.username,
					url: args.url,
					x: Math.floor(Math.random() * (kGameWidth - 20)) + 10,
					y: Math.floor(Math.random() * (kGameHeight - 20)) + 10,
					color: {
						r: Math.floor(Math.random() * 128) + 128,
						g: Math.floor(Math.random() * 128) + 128,
						b: Math.floor(Math.random() * 128) + 128
					}
				};
				
				this.username = args.username;
				this.server.join(this, this.params);
				
				var presence = [];
				for (var username in this.server.players) {
					presence.push(this.server.players[username].params);
				}
				
				this.sendFrame('WELCOME', {
					presence: presence,
					history: this.server.history
				});
			} catch(e) {
				delete this.username;
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
			case 'SHOOT':
				this.server.broadcast('SHOOT', args, this);
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
