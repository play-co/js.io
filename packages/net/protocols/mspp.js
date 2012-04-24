jsio('import net');
jsio('from net.protocols.buffered import BufferedProtocol');
jsio('import std.utf8 as utf8');

/*
works like this:
OPEN
upstream:
length_after_colon:id,0host,port

downstream:
length_after_colon:id,0
-----
CLOSE
upstream:
length_after_colon:id,1

downstream:
length_after_colon:id,1errcode
-----
DATA
upstream/downstream:
length_after_colon:id,2datadatadata
*/

var loggers = {};
loggers.stream = logging.get('MSPPStream');
loggers.protocol = logging.get('MSPPProtocol');

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
		if (this.encoding == 'utf8') {
			var raw = utf8.decode(data);
			var length = raw[1];
			// TODO: actually buffer this stuff properly
			if (length != data.length) {
				throw new Error("Incomplete utf8 codepoint");
			}
			data = raw[0]
		}
		loggers.stream.debug('_onreadraw '+data);
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

/**
 * @extends net.protocols.buffered.BufferedProtocol
 */
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

	this.connectionLost = function(reason) {
		loggers.protocol.debug('closed: '+reason);
		this.state = state.closed;
		for (var stream in this.streams)
			this.streams[stream].onclose(reason);
	}

	this.openStream = function(stream, host, port) {
		if (this.state == state.closed) {
			this.state = state.connecting;
			net.connect(this, this.transportType, this.transportOptions);
		}
		var id = ++this.currentId;
		this.streams[id] = stream;
		this._write([id, frames.OPEN, host+","+port]);
		return id;
	}

	this.closeStream = function(id) {
		this._write([id, frames.CLOSE, ""]);
	}

	this.writeToStream = function(id, data) {
		this._write([id, frames.DATA, data]);
	}

	this.bufferUpdated = function() {
		loggers.protocol.debug("bufferUpdated. state: "+this.state+". buffer: "+this.buffer._rawBuffer);
		if (this.state != state.consuming)
			throw new Error("buffer update in invalid MSPP state: "+this.state);
		if (! this.buffer.hasDelimiter(':'))
			return;
		var lStr = this.buffer.peekToDelimiter(':');
		var len = parseInt(lStr);
		if (! this.buffer.hasBytes(len + lStr.length + 1))
			return;
		this.buffer.consumeThroughDelimiter(':');
		var streamId = this.buffer.consumeToDelimiter(',');
		this.buffer.consumeBytes(1);
		var frameType = parseInt(this.buffer.consumeBytes(1));
		len -= (streamId.length + 2);
		streamId = parseInt(streamId);
		var data = this.buffer.consumeBytes(len);
		switch(frameType) {
			case frames.OPEN:
				this.streams[streamId].onopen();
				break;
			case frames.CLOSE:
				this.streams[streamId].onclose(data);
				break;
			case frames.DATA:
				this.streams[streamId]._onreadraw(data);
				break;
			default:
				throw new Error('invalid MSPP data type!');
		}
	}

	this._write = function(data) {
		if (this.state != state.consuming) {
			loggers.protocol.debug("buffering write: "+data);
			this.writeBuffer.push(data);
			return;
		}
		var s = data[0] + "," + data[1] + data[2];
		s = s.length + ":" + s;
		loggers.protocol.debug('write: '+s);
		this.transport.write(s);
	}
});
