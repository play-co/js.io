exports = function(name, parent, proto) {
	if (!proto) { proto = parent; parent = null; }
	var protoRef = {},
		loggingProto = bind(this, LogClassProto, name, proto, logging.get(name), protoRef);
	protoRef.proto = loggingProto;
	return parent ? Class(parent, loggingProto) : Class(loggingProto);
}

function LogClassProto(name, proto, logger, protoRef, supr) {
	proto.prototype = protoRef.proto.prototype;
	var p = new proto(logger, supr);
	p.__class__ = name;
	return p;
}

