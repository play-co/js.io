/*
Fast incremental JavaScript UTF-8 encoder/decoder, by Jacob Rus.

API for decode from Orbited: as far as I know, the first incremental
JavaScript UTF-8 decoder.

Inspired by the observation by Johan Sundström published at:
http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html

Note that this code throws an error for invalid UTF-8. Because it is so much
faster than previous implementations, the recommended way to do lenient
parsing is to first try this decoder, and then fall back on a slower lenient
decoder if necessary for the particular use case.

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
//var utf8 = this.utf8 = exports;

exports.UnicodeCodecError = function (message) { 
	this.message = message; 
};

var UnicodeCodecError = exports.UnicodeCodecError;

UnicodeCodecError.prototype.toString = function () {
	return 'UnicodeCodecError' + (this.message ? ': ' + this.message : '');
};

exports.encode = function (unicode_string) {
	// Unicode encoder: Given an arbitrary unicode string, returns a string
	// of characters with code points in range 0x00 - 0xFF corresponding to
	// the bytes of the utf-8 representation of those characters.
	try {
		return unescape(encodeURIComponent(unicode_string));
	}
	catch (err) {
		throw new UnicodeCodecError('invalid input string');
	};
};
exports.decode = function (bytes) {
	// Unicode decoder: Given a string of characters with code points in
	// range 0x00 - 0xFF, which, when interpreted as bytes, are valid UTF-8,
	// returns the corresponding Unicode string, along with the number of
	// bytes in the input string which were successfully parsed.
	//
	// Unlike most JavaScript utf-8 encode/decode implementations, properly
	// deals with partial multi-byte characters at the end of the byte string.
	if (/[^\x00-\xFF]/.test(bytes)) {
		throw new UnicodeCodecError('invalid utf-8 bytes');
	};
	var len, len_parsed;
	len = len_parsed = bytes.length;
	var last = len - 1;
	// test for non-ascii final byte. if last byte is ascii (00-7F) we're done.
	if (bytes.charCodeAt(last) >= 0x80) {
		// loop through last 3 bytes looking for first initial byte of unicode
		// multi-byte character. If the initial byte is 4th from the end, we'll
		// parse the whole string.
		for (var i = 1; i <= 3; i++) {
			// initial bytes are in range C0-FF
			if (bytes.charCodeAt(len - i) >= 0xC0) {
				len_parsed = len - i;
				break;
			};
		};
		try {
			// if the last few bytes are a complete multi-byte character, parse
			// everything (by setting len_parsed)
			decodeURIComponent(escape(bytes.slice(len_parsed)));
			len_parsed = len;
		}
		catch (err) { /* pass */ };
	};
	try {
		return [
			decodeURIComponent(escape(bytes.slice(0, len_parsed))),
			len_parsed
		];
	}
	catch (err) {
		throw new UnicodeCodecError('invalid utf-8 bytes');
	};
};
