// Sort of like a twisted protocol
require('jsio', ['Class'])

exports.Protocol = Class(function() {
    this.connectionMade = function() {
        throw new Error("Not implemented");
    }

    this.dataReceived = function(data) {
        throw new Error("Not implemented");
    }

    this.connectionLost = function(reason) {
        throw new Error("Not implemented");
    }

});



// Sort of like a twisted factory
exports.Server = Class(function() {
    this.init = function(protocolClass) {
        this._protocolClass = protocolClass;
    }

    this.connectionMade = function(transport) {
        var p = this.buildProtocol()
        p.server = this;
        transport.makeConnection(p);
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


