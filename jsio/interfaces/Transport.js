
jsio.declare('jsio.interfaces.Transport', function() {
    this.write = function(data, encoding) {
        throw new Error("Not implemented");
    }
    this.getPeer = function() {
        throw new Error("Not implemented");
    }
});

