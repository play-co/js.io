jsio('from net.interfaces import Protocol');

var EmptyBufferError = exports.EmptyBufferError = Class(function () {
	this.init = function(message) { this.message = message; }
})

exports.Buffer = Class(function(supr) {

	this.init = function(rawBuffer) {
		
		this._rawBuffer = !!rawBuffer ? rawBuffer : "";
	}

	this.getLength = function() {
		return this._rawBuffer.length;
	}

	this.append = function(data) {
		logger.debug('append', JSON.stringify(data));
		this._rawBuffer += data;
	}

	this.peekBytes = function(num) {
		if (!!num)
			return this._rawBuffer.slice(0, num);
		else 
			return this._rawBuffer;
	}

	this.peekToDelimiter = function(delimiter) {
		delimiter = delimiter ? delimiter : '\n';
		var i = this._rawBuffer.indexOf(delimiter);
		if (i == -1)
			throw new EmptyBufferError("delimiter " + delimiter + "not present in buffer");
		else
			return this._rawBuffer.slice(0, i);
	}

	this.consumeBytes = function(num) {
		var output = this.peekBytes(num);
		this._rawBuffer = this._rawBuffer.slice(output.length);
		return output;
	}
	this.consumeMaxBytes = function(num) {
		var output = this._rawBuffer.slice(0, num);
		this._rawBuffer = this._rawBuffer(num);
		return output;
	}
	this.consumeAllBytes = function() {
		var temp = this._rawBuffer;
		this._rawBuffer = "";
		return temp;
	}
	
	this.consumeThroughDelimiter = function(delimiter) {
		return this.consumeToDelimiter(delimiter) + this.consumeBytes(delimiter.length);
	}

	this.consumeToDelimiter = function(delimiter) {
		delimiter = !!delimiter ? delimiter : "\n"
		var output = this.peekToDelimiter(delimiter);
		this._rawBuffer = this._rawBuffer.slice(output.length);
		return output;
	}

	this.hasBytes = function(num) {
		num = num ? num : 0;
		return this._rawBuffer.length >= num;
	}

	this.hasDelimiter = function(delimiter) {
		delimiter = !!delimiter ? delimiter : '\n';
		return (this._rawBuffer.indexOf(delimiter) != -1);
	}

})
