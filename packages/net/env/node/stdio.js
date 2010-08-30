jsio('import net.interfaces');

var Transport = Class(net.interfaces.Transport, function(supr) {
    this.init = function(inStream, outStream) {
        this._inStream = inStream;
        this._outStream = outStream;
        this.setEncoding('plain')
    }

    this.setEncoding = function(encoding) {
        supr(this, 'setEncoding', arguments);
        if (encoding == 'plain') {
            encoding = 'binary';
        }
        this._inStream.setEncoding(encoding);
        this._outStream.setEncoding(encoding);
    }

    this.makeConnection = function(protocol) {
        this._inStream.on('data', bind(protocol, 'dataReceived'));
    }


    this.write = function(data) {
        this._outStream.write(data);
        this._outStream.flush();
    }

    this.loseConnection = function() {
    }
});


exports.Connector = Class(net.interfaces.Connector, function() {
    this.connect = function() {
        var stdin = process.openStdin();
        var stdout = process.stdout
        var transport = new Transport(stdin, stdout)
        this.onConnect(transport);
    }
});
