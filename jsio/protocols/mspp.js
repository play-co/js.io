jsio('import Class, log, jsio.logging');
jsio('import jsio.std.utf8 as utf8');
jsio('from jsio.protocols.buffered import BufferedProtocol');

var loggers = {};
loggers.stream = jsio.logging.getLogger('MSPPStream');
loggers.protocol = jsio.logging.getLogger('MSPPProtocol');
loggers.stream.setLevel(0);
loggers.protocol.setLevel(0);

var frames = {
    'OPEN':  0,
    'CLOSE': 1,
    'DATA':  2
};

exports.MSPPStream = Class(function() {
    this.setMultiplexer = function(multiplexer) {
        loggers.stream.debug('setMultiplexer: '+multiplexer);
        this.multiplexer = multiplexer;
    }

    this.setEncoding = function(encoding) {
        loggers.stream.debug('setEncoding: '+encoding);
        this.encoding = encoding;
    }

    this.open = function(host, port, isBinary) {
        if (isBinary)
            this.encoding = 'utf8';
        this.id = this.multiplexer.openStream(this, host, port);
        loggers.stream.debug('open '+this.id+": "+host+" "+port+" "+isBinary);
    }

    this.close = function() {
        loggers.stream.debug('close '+this.id);
        this.multiplexer.close(this.id);
    }

    this.send = function(data, encoding) {
        loggers.stream.debug('send '+this.id+": "+data+" "+encoding);
        if ((encoding || this.encoding) == 'utf8')
            data = utf8.encode(data);
        this.multiplexer.writeToStream(this.id, data);
    }

    this._onreadraw = function(data) {
        if (this.encoding == 'utf8')
            data = utf8.decode(data);
        this.onread(data);
    }

    this.onopen = function() {}
    this.onclose = function(err) {}
    this.onread = function(data) {}
});

var state = {};
state.closed = 0;
state.connecting = 1;
state.consuming = 2;

exports.MSPPProtocol = Class(BufferedProtocol, function(supr) {
    this.init = function() {
        loggers.protocol.debug('new MSPPProtocol');
        supr(this, 'init', []);
        this.state = state.closed;
        this.transportType = null;
        this.transportOptions = null;
        this.currentId = 0;
        this.streams = {};
        this.writeBuffer = [];
    }

    this.setTransport = function(transportType, transportOptions) {
        this.transportType = transportType;
        this.transportOptions = transportOptions;
    }

    this.connectionMade = function(isReconnect) {
        loggers.protocol.debug('connectionMade');
        this.state = state.consuming;
        for (var i = 0; i < this.writeBuffer.length; i++)
            this._write(this.writeBuffer[i]);
        writeBuffer = [];
    }

    this.connectionLost = this.connectionFailed = function(reason) {
        loggers.protocol.debug('closed: '+reason);
        this.state = state.closed;
        for (stream in this.streams)
            this.streams[stream].onclose(reason);
    }

    this.openStream = function(stream, host, port) {
        if (this.state == state.closed) {
            this.state = state.connecting;
            jsio.connect(this, this.transportType, this.transportOptions);
        }
        var id = ++this.currentId;
        this.streams[id] = stream;
        this._write([id, frames.OPEN, host, port]);
        return id;
    }

    this.closeStream = function(id) {
        this._write([id, frames.CLOSE]);
    }

    this.writeToStream = function(id, data) {
        this._write([id, frames.DATA, data]);
    }

    this.bufferUpdated = function() {
        if (this.state != state.consuming)
            throw new Error("buffer update in invalid MSPP state: "+this.state);
        while (1) {
            if (! this.buffer.hasDelimiter('['))
                break;
            var frameLength = this.buffer.peekToDelimiter('[');
            var frameLengthLength = frameLength.length;
            frameLength = parseInt(frameLength);
            if (! this.buffer.hasBytes(frameLengthLength + frameLength))
                break;
            this.buffer.consumeBytes(frameLengthLength);
            var data = this.buffer.consumeBytes(frameLength);
            loggers.protocol.debug('read: '+data);
            data = JSON.parse(data);
            switch(data[1]) {
                case frames.OPEN:
                    this.streams[data[0]].onopen();
                    break;
                case frames.CLOSE:
                    this.streams[data[0]].onclose(data[2]);
                    break;
                case frames.DATA:
                    this.streams[data[0]]._onreadraw(data[2]);
                    break;
                default:
                    throw new Error('invalid MSPP data type!');
            }
        }
    }

    this._write = function(data) {
        if (this.state != state.consuming) {
            loggers.protocol.debug("buffering write: "+data);
            this.writeBuffer.push(data);
            return;
        }
        data = JSON.stringify(data);
        data = data.length + data;
        loggers.protocol.debug('write: '+data);
        this.transport.write(data);
    }
});
