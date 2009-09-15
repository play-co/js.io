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

var myClearTimeout = this.myClearTimeout = function (timer) {
  return timer ? clearTimeout(timer) : null;
};

var bind = this.bind = function(context, func) {
  return function () {
    func.apply(context, arguments);
  };
};

var inherits = this.inherits = function (ctor, superCtor) {
  var tempCtor = function(){};
  tempCtor.prototype = superCtor.prototype;
  ctor.super_ = superCtor.prototype;
  ctor.prototype = new tempCtor();
  ctor.prototype.constructor = ctor;
};

var debug = this.debug = function () {
  var message = [];
  for (var i=0; i < arguments.length; i++) {
    message.push(JSON.stringify(arguments[i]));
  };
  node.stdio.writeError(message.join(' ') + '\n');
};

// helper to make a hash table from the arguments for membership testing
// Use like: 'a' in set('a', 'b', 'c')
var set = this.set = function () {
  var set = {};
  var len = arguments.length;
  for (var i=0; i < len; i++) {
    set[arguments[i]] = true;
  };
  return set;
}

// helper to test if string 2 is at the beginning of string 1
var startswith = this.startswith = function (str1, str2) {
  return str1.slice(0, str2.length) == str2;
};

var assert_or_error = this.assert_or_error = function (exp, error, message) {
  if (!exp) { throw new error(message)}
}
var AssertionError = this.AssertionError = function (message) { this.message = message; };
AssertionError.prototype.toString = function () {
  return 'AssertionError' + (this.message ? ': ' + this.message : '');
};
var assert = this.assert = function (exp, message) {
  return assert_or_error(exp, AssertionError, message)
};

var CodecError = this.CodecError = function (message) { this.message = message; };
CodecError.prototype.toString = function () {
  return 'CodecError' + (this.message ? ': ' + this.message : '');
};

// note that 'bytes' are actually just encoded using the lower byte of a
// each 16-bit-unit of a JS String, while 'raw' means an array of integers.
var raw_to_bytes = this.raw_to_bytes = function (raw) {
  return String.fromCharCode.apply(String, raw);
};

var bytes_to_raw = this.bytes_to_raw = function (bytes) {
  assert_or_error(!(/[^\x00-\xFF]/.test(bytes)), CodecError,
                  'out-of-range input characters')
  raw = [];
  for (var i=0, n=bytes.length; i < n; i++) {
    raw.push(bytes.charCodeAt(i));
  };
  return raw;
};

// schedule a callback to run at the next available moment,
// equivalent to setTimeout(callback, 0)
var reschedule = this.reschedule = function (callback) {
  var timer = new node.Timer(); 
  timer.addListener('timeout', callback);
  timer.start(0, 0);
  return timer;
}

// cached static files
var staticFile = this.staticFile = function (){
  var cache = {} // static file content indexed by filename
  var getfile = function(path) {
    promise = new node.Promise();
    cacheContent = cache[path];
    if (cacheContent !== undefined) {
      // the file is in the cache, return it
      reschedule(function(){
        promise.emitSuccess([cacheContent]);
      });
    } else {
      // load file from disk, save it in the cache, and return it
      node.fs.cat(path, 'utf8')
        .addCallback(function(fileContent) {
          cache[path] = fileContent;
          promise.emitSuccess([fileContent]);
        })
        .addErrback(function(){
          promise.emitError();
        });
    };
    return promise;
  };
  return getfile;
}();

var CreateClass = this.CreateClass = function(target) {
  target.init.prototype = target;
  return target.init;
}