// Sort of like a twisted protocol
jsio.declare('jsio.interfaces.Protocol', jsio.Class(function() {

    this.connectionMade = function() {
        throw new Error("Not implemented");
    }

    this.dataReceived = function(data) {
        throw new Error("Not implemented");
    }

    this.connectionLost = function(reason) {
        throw new Error("Not implemented");
    }

}));
