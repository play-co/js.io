// Sort of like a twisted protocol
jsio('import Class, bind');

exports.Protocol = Class(function() {
    this.connectionMade = function(isReconnect) {
    }

    this.dataReceived = function(data) {
    }

    this.connectionLost = function(reason) {
    }
    
    this.connectionFailed = function() {

    }

});

// Sort of like a twisted factory
exports.Server = Class(function() {
    this.init = function(protocolClass) {
        this._protocolClass = protocolClass;
    }

    this.buildProtocol = function() {
        return new this._protocolClass();
    }
    
});

exports.Transport = Class(function() {
    this.write = function(data, encoding) {
        throw new Error("Not implemented");
    }
    this.getPeer = function() {
        throw new Error("Not implemented");
    }
});

exports.Listener = Class(function() {
	this.init = function(server, opts) {
		this._server = server;
		this._opts = opts || {};
	}
	
	this.onConnect = function(transport) {
		var p = this._server.buildProtocol();
		p.transport = transport;
        p.server = this._server;
		transport.protocol = p;
		transport.makeConnection(p);
		p.connectionMade();
	}
	
	this.listen = function() { throw new Error('Abstract class'); }
	this.stop = function() {}
});

exports.Connector = Class(function() {
	this.init = function(protocol, opts) {
		this._protocol = protocol;
		this._opts = opts;
	}
	
	this.onConnect = function(transport) {
		transport.makeConnection(this._protocol);
		this._protocol.transport = transport;
		this._protocol.connectionMade();
	}
	
	this.getProtocol = function() { return this._protocol; }
});

exports.PubSub = Class(function() {
	this.publish = function(signal) {
		if(!this._subscribers) { return; }
		
		var args = Array.prototype.slice.call(arguments, 1);
		if(this._subscribers.__any) {
			var anyArgs = [signal].concat(args);
			for(var i = 0, sub; sub = this._subscribers.__any[i]; ++i) {
				sub.apply(window, args);
			}
		}
		
		if(!this._subscribers[signal]) { return; }		
		for(var i = 0, sub; sub = this._subscribers[signal][i]; ++i) {
			sub.apply(window, args);
		}
	}
	
	this.subscribe = function(signal) {
		if(!this._subscribers) { this._subscribers = {}; }
		if(!this._subscribers[signal]) { this._subscribers[signal] = []; }
		this._subscribers[signal].push(bind.apply(jsio, Array.prototype.slice.call(arguments, 1)));
	}
});