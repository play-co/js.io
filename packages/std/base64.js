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

var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
var pad = '=';
var padChar = alphabet.charAt(alphabet.length - 1);

var shorten = function (array, number) {
	// remove 'number' characters from the end of 'array', in place (no return)
	for (var i = number; i > 0; i--){ array.pop(); };
};

var decode_map = {};
for (var i=0, n=alphabet.length; i < n; i++) {
	decode_map[alphabet.charAt(i)] = i;
};


// use this regexp in the decode function to sniff out invalid characters.
var alphabet_inverse = new RegExp('[^' + alphabet.replace('-', '\\-') + ']');



var Base64CodecError = exports.Base64CodecError = function (message) { 
	this.message = message;
};
Base64CodecError.prototype.toString = function () {
  return 'Base64CodecError' + (this.message ? ': ' + this.message : '');
};

var assertOrBadInput = function (exp, message) {
	if (!exp) { throw new Base64CodecError(message) };
};

exports.encode = function (bytes) {
	assertOrBadInput(!(/[^\x00-\xFF]/.test(bytes)), // disallow two-byte chars
		'Input contains out-of-range characters.');
	var padding = '\x00\x00\x00'.slice((bytes.length % 3) || 3);
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
			alphabet.charAt((newchars)	   & 077));	  
	};
	shorten(out_array, padding.length);
	return out_array.join('');
};

exports.decode = function (b64text) {
	logger.debug('decode', b64text);
	b64text = b64text.replace(/\s/g, '') // kill whitespace
	// strip trailing pad characters from input; // XXX maybe some better way?
	var i = b64text.length; while (b64text.charAt(--i) === pad) {}; b64text = b64text.slice(0, i + 1);
	assertOrBadInput(!alphabet_inverse.test(b64text), 'Input contains out-of-range characters.');
	var padding = Array(5 - ((b64text.length % 4) || 4)).join(padChar);
	b64text += padding; // pad with last letter of alphabet
	var out_array = [];
	for (var i=0, n=b64text.length; i < n; i+=4) {
		newchars = (
			(decode_map[b64text.charAt(i)]   << 18) +
			(decode_map[b64text.charAt(i+1)] << 12) +
			(decode_map[b64text.charAt(i+2)] << 6)  +
			(decode_map[b64text.charAt(i+3)]));
		out_array.push(
			(newchars >> 020) & 0xFF,
			(newchars >> 010) & 0xFF, 
			(newchars)		& 0xFF);
	};
	shorten(out_array, padding.length);
	var result = String.fromCharCode.apply(String, out_array);
	logger.debug('decoded', result);
	return result;
};
