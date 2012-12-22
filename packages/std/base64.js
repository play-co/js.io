/*
"URL-safe" Base64 Codec, by Jacob Rus

This library happily strips off as many trailing '=' as are included in the
input to 'decode', and doesn't worry whether its length is an even multiple
of 4. It does not include trailing '=' in its own output. It uses the
'URL safe' base64 alphabet, where the last two characters are '-' and '_'.

--------------------

Copyright (c) 2009 Jacob Rus

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
	trailingPad = '=',
	padChar = alphabet.charAt(alphabet.length - 1);

var decodeMap = {};
for (var i = 0, len = alphabet.length; i < len; i++) {
	decodeMap[alphabet.charAt(i)] = i;
}

// use this regexp in the decode function to sniff out invalid characters.
var alphabet_inverse = new RegExp('[^' + alphabet.replace('-', '\\-') + ']');

exports.Base64CodecError = Class(Error, function(supr) {
	this.name = 'Base64CodecError';
	
	this.init = function(message) {
		this.message = message;
	}
});

var assertOrBadInput = function (exp, message) {
	if (!exp) { throw new exports.Base64CodecError(message) };
};

exports.encode = function (bytes, skipPadding) {
	assertOrBadInput(!(/[^\x00-\xFF]/.test(bytes)), // disallow two-byte chars
		'Input contains out-of-range characters.');
	var paddingSize = bytes.length % 3;
	var padding = '\x00\x00\x00'.slice(paddingSize || 3);
	bytes += padding; // pad with null bytes
	var out_array = [];
	for (var i=0, n=bytes.length; i < n; i+=3) {
		var newchars = (
			(bytes.charCodeAt(i)   << 020) +
			(bytes.charCodeAt(i+1) << 010) +
			(bytes.charCodeAt(i+2)));
		out_array.push(
			alphabet.charAt((newchars >> 18) & 077),
			alphabet.charAt((newchars >> 12) & 077),
			alphabet.charAt((newchars >> 6)  & 077),
			alphabet.charAt((newchars)       & 077));
	};
	
	out_array.length -= padding.length;
	var ret = out_array.join('');
	if (!skipPadding) {
		if (paddingSize == 1) {
			ret += '==';
		} else if (paddingSize == 2) {
			ret += '=';
		}
	}
	
	return ret;
};

exports.decode = function (b64text) {
	logger.debug('decode', b64text);
	b64text = b64text.replace(/\s/g, ''); // kill whitespace
	
	// strip trailing pad characters from input; // XXX maybe some better way?
	var i = b64text.length;
	while (b64text.charAt(--i) === trailingPad) {};
	b64text = b64text.slice(0, i + 1);
	
	assertOrBadInput(!alphabet_inverse.test(b64text), 'Input contains out-of-range characters.');
	
	var padLength = 4 - ((b64text.length % 4) || 4),
		padding = Array(padLength + 1).join(padChar);
	
	b64text += padding; // pad with last letter of alphabet
	
	var out_array = [],
		length = i + padLength + 1; // length of b64text
	
	for (var i = 0; i < length; i += 4) {
		newchars = (
			(decodeMap[b64text.charAt(i)]   << 18) +
			(decodeMap[b64text.charAt(i+1)] << 12) +
			(decodeMap[b64text.charAt(i+2)] << 6)  +
			(decodeMap[b64text.charAt(i+3)]));
		out_array.push(
			(newchars >> 020) & 0xFF,
			(newchars >> 010) & 0xFF, 
			(newchars)		& 0xFF);
	};
	
	length = (out_array.length -= padLength);
	
	// Safari fromCharCode can't be passed more than 65536 arguments at once
	var result,
		MAX_CHUNK = 65536;
	
	if (length > MAX_CHUNK) {
		result = [];
		var i = 0, j = 0;
		while (i < length) {
			result[j++] = String.fromCharCode.apply(String, out_array.slice(i, i + MAX_CHUNK));
			i += MAX_CHUNK;
		}
		result = result.join('');
	} else {
		result = String.fromCharCode.apply(String, out_array);
	}
	logger.debug('decoded', result);
	return result;
};
