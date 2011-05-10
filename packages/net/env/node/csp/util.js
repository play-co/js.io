/*
Helper functions, &c., for a comet server by Jacob Rus.

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

// helper to test if string 2 is at the beginning of string 1
exports.startswith = function (str1, str2) {
	return str1.substring(0, str2.length) == str2;
};

exports.JSIOError = Class(Error, function () {
	this.name = 'JSIOError';
	this.toString = Error.prototype.toString;
	this.init = function (message, fileName, lineNumber) {
		this.name = this.name; // promote class property to instance
		this.message = message || '';
		this.fileName = fileName || '«filename»'; // location.href; // XXX what should go here?
		this.lineNumber = isNaN(+lineNumber) ? 0 : +lineNumber
	};
});

exports.AssertionError = Class(exports.JSIOError, function (supr) {
	this.name = 'AssertionError'
	this.init = function () {supr(this, 'init', arguments)}
});

exports.assert = function (exp, message) {
	if (!exp) {
		throw new exports.AssertionError(message)
	};
};

// schedule a callback to run at the next available moment,
// equivalent to setTimeout(callback, 0)
exports.reschedule = function (callback) {
	return setTimeout(callback, 0);
};

// cached static files
exports.staticFile = (function(){
	var cache = {} // static file content indexed by filename
	var getfile = function(path, callback) {
		cacheContent = cache[path];
		if (cacheContent !== undefined) {
			// the file is in the cache, return it
			exports.reschedule(function(){
				callback(null, [cacheContent]);
			});
		} else {
			// load file from disk, save it in the cache, and return it
			process.fs.readFile(path, 'utf8', function(err, fileContent){
				if (err) {
					callback('staticFile readFile error ' + err)
				} else {
					cache[path] = fileContent;
					callback(null, [fileContent]);
				}
			})
		};
		return promise;
	};
	return getfile;
})();
