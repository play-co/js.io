var makeErrorClass = function(name, _code) {
	var toString = function() {
		return name + (this.message ? ': ' + this.message : '');
	}

	var ctor = function(data) {
		if (typeof data == 'string') {
			this.message = data;
		} else {
			this.data = data;
		}
	}
	
	ctor.prototype = {
		type: name,
		toString: toString
	};
	
	return ctor;
}

exports.ReadyStateError = makeErrorClass("ReadyStateError");
exports.InvalidEncodingError = makeErrorClass("InvalidEncodingError");
exports.ExpiredSession = makeErrorClass("ExpiredSession");

exports.ServerUnreachable = makeErrorClass("ServerUnreachable", 100);
exports.ConnectionTimeout = makeErrorClass("ConnectionTimeout", 101);

exports.ServerProtocolError = makeErrorClass("ServerProtocolError", 200);

exports.ServerClosedConnection = makeErrorClass("ServerClosedConnection", 301);
exports.ConnectionClosedCleanly = makeErrorClass("ConnectionClosedCleanly", 300);