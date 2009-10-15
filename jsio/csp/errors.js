var makeErrorClass = function(name, _code) {
	var out = function(message, code) {
		this.message = message;
		this.code = code || _code;
	}
	out.prototype.toString = function() {
		return name + (this.message ? ': ' + this.message : '');
	}
	return out;
}

exports.ReadyStateError = makeErrorClass("ReadyStateError");
exports.InvalidEncodingError = makeErrorClass("InvalidEncodingError");

exports.HandshakeTimeout = makeErrorClass("HandshakeTimeout", 100);
exports.SessionTimeout = makeErrorClass("HandshakeTimeout", 101);

exports.ServerProtocolError = makeErrorClass("ServerProtocolError", 200);

