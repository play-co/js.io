jsio('import Class, bind');
jsio('import jsio.logging');
jsio('from jsio.interfaces import Protocol');

var logger = jsio.logging.getLogger('jsio.buffer.Buffer');

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
        logger.info('append', JSON.stringify(data));
        this._rawBuffer += data;
    }

    this.peekBytes = function(num) {
        if (!!num)
            return this._rawBuffer.slice(0, num);
        else 
            return this._rawBuffer;
    }

    this.peekLine = function(delimiter) {
        delimiter = delimiter ? delimiter : '\n';
        var i = this._rawBuffer.indexOf(delimiter);
        if (i == -1)
            throw new EmptyBufferError("delimiter " + delmiter + "not present in buffer");
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
	
    this.consumeLine = function(delimiter) {
        delimiter = !!delimiter ? delimiter : "\n"
        var output = this.peekLine(delimiter);
        this._rawBuffer = this._rawBuffer.slice(output.length+delimiter.length);
        return output;
    }


    this.hasBytes = function(num) {
        num = num ? num : 0;
        return this._rawBuffer.length >= num;
    }

    this.hasLine = function(delimiter) {
        delimiter = !!delimiter ? delimiter : '\n';
        return (this._rawBuffer.indexOf(delimiter) != -1);
    }

})
