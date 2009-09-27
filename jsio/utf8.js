/*
JavaScript UTF-8 encoder/decoder, by Jacob Rus.

Inspired by the observation by Johan Sundström published at:
http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html

Note that this code throws an error for invalid UTF-8. Because it is so much
faster than other kinds of implementations, the recommended way to do lenient
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
(function() {
var UnicodeCodecError = this.UnicodeCodecError = function (message) { this.message = message; };
this.UnicodeCodecError.prototype.toString = function () {
  return 'UnicodeCodecError' + (this.message ? ': ' + this.message : '');
};
this.encode = function (unicode_string) {
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
this.decode = function (bytes) {
  // Unicode decoder: Given a string of characters with code points in
  // range 0x00 - 0xFF, which, when interpreted as bytes, are valid UTF-8,
  // returns the unicode string for those characters.
  if (/[^\x00-\xFF]/.test(bytes)) {
    throw new UnicodeCodecError('invalid utf-8 bytes');
  };
  try {
    return decodeURIComponent(escape(bytes));
  }
  catch (err) {
    throw new UnicodeCodecError('invalid utf-8 bytes');
  };
};
}).call(typeof(exports) != 'undefined' ? exports : (function() { window.utf8 = {}; return utf8; })())