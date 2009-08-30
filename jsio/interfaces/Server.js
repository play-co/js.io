// Sort of like a twisted factory
jsio.declare('jsio.Server', jsio.Class(function() {
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
    
}));
