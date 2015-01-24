// Copyright (c) 2010
// Michael Carter (cartermichael@gmail.com)
// Martin Hunt (mghunt@gmail.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

// Initialization of js.io occurs in a closure, preventing local variables
// from entering the global scope.  During execution, the method `jsio` is
// added to the global scope.

;(function () {
  function init(cloneFrom) {
    // We expect this code to be minified before production use, so we may
    // write code slightly more verbosely than we otherwise would.

    var INITIAL_FILE = '<initial file>';
    var MODULE_NOT_FOUND = 'MODULE_NOT_FOUND';

    // Should we parse syntax errors in the browser?
    var DEBUG = true;

    // Store a reference to the slice function for converting objects of
    // type arguments to type array.
    var SLICE = Array.prototype.slice;

    // js.io supports multiple JavaScript environments such as node.js and
    // most web browsers (IE, Firefox, WebKit).  The ENV object wraps
    // any utility functions that contain environment-specific code (e.g.
    // reading a file using node's `fs` library or a browser's
    // `XMLHttpRequest`).  Running js.io in other JavaScript environments
    // is as easy as implementing an environment object that conforms to
    // the abstract interface for an environment (provided below) and
    // calling `jsio.setEnv()`.
    var ENV;

    // Checks if the last character in a string is `/`.
    var rexpEndSlash = /(\/|\\)$/;

    function getModuleDef (path) {
      path += '.js';
      return jsio.__modules[path] || new ModuleDef(path);
    }

    // Creates an object containing metadata about a module.
    function ModuleDef (path) {
      this.path = path;
      this.friendlyPath = path;

      util.splitPath(path, this);
      this.directory = util.resolve(ENV.getCwd(), this.directory);
    };

    ModuleDef.prototype.setBase = function (baseMod, basePath) {
      this.baseMod = baseMod;
      this.basePath = basePath + '/' + baseMod;
    };

    var HOST = /^([a-z][a-z0-9+\-\.]*:\/\/.*?\/)(.*)$/;
    var PROTOCOL = /^[a-z][a-z0-9+\-\.]*:/

    // Utility functions
    var util = {
        // `util.bind` returns a function that, when called, will execute
        // the method passed in with the provided context and any additional
        // arguments passed to `util.bind`.
        //       util.bind(obj, 'f', a) -> function() { return obj.f(a); }
        //       util.bind(obj, g, a, b, c) -> function() { return g.call(g, a, b, c); }
        bind: function(context, method/*, args... */) {
          var args = SLICE.call(arguments, 2);
          return function () {
            method = (typeof method == 'string' ? context[method] : method);
            return method.apply(context, args.concat(SLICE.call(arguments, 0)));
          };
        },

        // `util.addEndSlash` accepts a string.  That string is returned with a `/`
        // appended if the string did not already end in a `/`.
        addEndSlash: function(str) {
          return rexpEndSlash.test(str) ? str : str + '/';
        },

        // `util.removeEndSlash` accepts a string.  It removes a trailing `/` if
        // one is found.
        removeEndSlash: function(str) {
          return str.replace(rexpEndSlash, '');
        },

        // `util.relative` accepts two paths (strings) and returns the second path
        // relative to the first.
        //
        //  - if `path` starts with `relativeTo`, then strip `path` off the
        //    `relativeTo` part
        //
        //         util.relative('abc/def/', 'abc') -> 'def'
        //
        //  - if `path` starts with some substring of `relativeTo`, remove
        //    this substring and add `../` for each remaining segment of
        //    `relativeTo`.
        //
        //         util.relative('abc/def/', 'abc/hij') -> '../def'
        //
        relative: function (relativeTo, path) {
          var len = relativeTo.length;
          if (path.substring(0, len) == relativeTo) {
            // if the relative path now starts with a path separator
            // either (/ or \), remove it
            /* Note: we're casting a boolean to an int by adding len to it */
            return path.slice(len + /[\/\\]/.test(path.charAt(len)));
          }

          var sA = util.removeEndSlash(path).split(ENV.pathSep),
            sB = util.removeEndSlash(relativeTo).split(ENV.pathSep),
            i = 0;

          /* Count how many segments match. */
          while(sA[i] == sB[i]) { ++i; }

          if (i) {
            /* If at least some segments matched, remove them.  The result is our new path. */
            path = sA.slice(i).join(ENV.pathSep);

            /* Prepend `../` for each segment remaining in `relativeTo`. */
            for (var j = sB.length - i; j > 0; --j) { path = '../' + path; }
          }

          return path;
        },

        // `buildPath` accepts an arbitrary number of string arguments to concatenate into a path.
        //     util.buildPath('a', 'b', 'c/', 'd/') -> 'a/b/c/d/'
        buildPath: function() {
          var pieces = [];
          for (var i = 0, n = arguments.length; i < n; ++i) {
            var piece = arguments[i];
            if (PROTOCOL.test(piece)) {
              pieces.length = 0;
            }

            if (piece != '.' && piece != './' && piece) {
              pieces.push(piece);
            }
          }

          return util.resolveRelativePath(pieces.join('/'));
        },

        // `resolveRelativePath` removes relative path indicators.  For example:
        //     util.resolveRelativePath('a/../b') -> b
        resolveRelativePath: function(path) {
          /* If the path starts with a protocol+host, store it and remove it (add it
             back later) so we don't accidently modify it. */
          var protocol = path.match(HOST);
          if (protocol) { path = protocol[2]; }

          /* Remove multiple slashes and trivial dots (`/./ -> /`). */
          path = path.replace(/\/+/g, '/').replace(/\/\.\//g, '/');

          /* Loop to collapse instances of `../` in the path by matching a previous
             path segment.  Essentially, we find substrings of the form `/abc/../`
             where abc is not `.` or `..` and replace the substrings with `/`.
             We loop until the string no longer changes since after collapsing
             possible instances once, we may have created more instances that can
             be collapsed.
          */
          var o;
          while((o = path) != (path = path.replace(/(^|\/)(?!\.?\.\/)([^\/]+)\/\.\.\//g, '$1'))) {}
          /* Don't forget to prepend any protocol we might have removed earlier. */
          return protocol ? protocol[1] + path.replace(/^\//, '') : path;
        },

        isAbsolutePath: function (path) {
          return /^\//.test(path) || PROTOCOL.test(path);
        },

        resolve: function (from, to) {
          return this.isAbsolutePath(to) ? util.resolveRelativePath(to) : util.buildPath(from, to);
        },

        resolveRelativeModule: function (modulePath, directory) {
          var result = [],
            parts = modulePath.split('.'),
            len = parts.length,
            relative = (len > 1 && !parts[0]),
            i = relative ? 0 : -1;

          while(++i < len) { result.push(parts[i] ? parts[i] : '..'); }
          return util.buildPath(relative ? directory : '', result.join('/'));
        },
        resolveModulePath: function (modulePath, directory) {
          // resolve relative paths
          if (modulePath.charAt(0) == '.') {
            return [
              getModuleDef(util.resolveRelativeModule(modulePath, directory)),
              getModuleDef(util.resolveRelativeModule(modulePath + '.index', directory))
            ];
          }

          // resolve absolute paths with respect to jsio packages/
          var pathSegments = modulePath.split('.');
          var baseMod = pathSegments[0];

          if (jsioPath.cache.hasOwnProperty(baseMod)) {
            pathSegments.shift();
            var pathString = pathSegments.join('/');
            return [
              getModuleDef(util.buildPath(jsioPath.cache[baseMod], pathString)),
              getModuleDef(util.buildPath(jsioPath.cache[baseMod], pathString + '/index'))
            ];
          }

          var pathString = pathSegments.join('/');
          var defs = [];
          var paths = jsioPath.get();
          var len = paths.length;
          for (var i = 0; i < len; ++i) {
            var base = paths[i];
            var path = util.buildPath(base, pathString);

            var moduleDef = getModuleDef(path);
            moduleDef.setBase(baseMod, base);
            defs.push(moduleDef);

            var moduleDef = getModuleDef(path + '/index');
            moduleDef.setBase(baseMod, base);
            defs.push(moduleDef);
          }
          return defs;
        },
        splitPath: function(path, result) {
          if (!result) { result = {}; }
          var i = path.lastIndexOf('/') + 1;
          result.directory = path.substring(0, i);
          result.filename = path.substring(i);
          return result;
        }
      };

    // construct the top-level jsio object
    var jsio = util.bind(this, _require, null, null, null);

    jsio.__util = util;
    jsio.__init__ = init;

    var srcCache;
    jsio.setCache = function(cache) { srcCache = jsio.__srcCache = cache; }
    jsio.setCache(cloneFrom && cloneFrom.__srcCache || {});

    jsio.setCachedSrc = function(path, src, locked) {
      if (srcCache[path] && srcCache[path].locked) {
        console.warn('Cache is ignoring (already present and locked) src ' + path);
        return;
      }
      srcCache[path] = { path: path, src: src, locked: locked };
    };
    jsio.getCachedSrc = function(path) { return srcCache[path]; }

    jsio.__filename = 'jsio.js';
    jsio.__cmds = [];
    jsio.__jsio = jsio;
    jsio.__require = _require;
    jsio.__modules = {preprocessors:{}};
    var jsioPath = {
        set: function(path) {
          this.value = [];
          (typeof path == 'string' ? [path] : path).map(this.add, this);
        },
        get: function() { return jsioPath.value.slice(0); },
        add: function (path) {
          if (arguments.length == 2) {
            var from = arguments[0];
            var to = util.resolve(ENV.getCwd(), arguments[1]);
            this.cache[from] = to;
          } else {
            path = util.resolve(ENV.getCwd(), path);
            var v = jsioPath.value, len = v.length;
            for (var i = 0; i < len; ++i) {
              if (v[i] == path) { return; }
            }
            v.push(path);
          }
        },
        remove: function(path) {
          var v = jsioPath.value, len = v.length;
          for (var i = 0; i < len; ++i) {
            if (v[i] == path) {
              v.splice(i, 1);
            }
          }
        },
        value: [],
        cache: {}
      };

    jsio.path = jsioPath;
    jsio.addPath = util.bind(jsioPath, 'add');
    jsio.addCmd = util.bind(jsio.__cmds, 'push');

    jsio.setEnv = function(envCtor) {
      if (!envCtor && cloneFrom) {
        ENV = new cloneFrom.__env.constructor(util);
      } else {
        if (typeof envCtor == 'string') {
          envCtor = ({
              node: ENV_node,
              browser: ENV_browser
            })[envCtor] || ENV_browser;
        }

        ENV = new envCtor(util);
      }

      this.__env = ENV;
      this.__dir = ENV.getCwd();

      if (!ENV.loadModule) {
        ENV.loadModule = loadModule;
      }

      jsio.path.cache['jsio'] = ENV.getPath();
      if (envCtor == ENV_browser) {
        jsio.path.set(ENV.getPath());
      }
    }

    if (cloneFrom) {
      jsio.setEnv();
    } else if (typeof JSIO_ENV_CTOR !== 'undefined') {
      jsio.setEnv(JSIO_ENV_CTOR);
    } else if (typeof process !== 'undefined' && process.version) {
      jsio.setEnv('node');
    } else if (typeof XMLHttpRequest != 'undefined' || typeof ActiveXObject != 'undefined') {
      jsio.setEnv('browser');
    }

    jsio.main = ENV && ENV.main;

    var boundJsio;
    var localJsio = function (req) {
      if (!boundJsio) {
        boundJsio = util.bind(this, _require, {}, ENV.getPath(), 'jsio.js');
      }

      return boundJsio(req, {dontExport: true, dontPreprocess: true});
    };

    /*
    function ENV_abstract() {
      this.global = null;
      this.getCwd = function() {};
      this.getPath = function() {};
      this.eval = function(code, path) {};
      this.fetch = function(path) { return contentsOfPath; };
      this.log = function(args...) {};
    }
    */

    function ENV_node() {
      var Module = module.constructor;

      var parent = module.parent;
      var req = util.bind(parent, parent && parent.require || require);

      var fs = req('fs');
      var path = req('path');
      var vm = req('vm');

      this.requireCache = require.cache;
      this.main = require.main;
      this.name = 'node';
      this.global = global;

      var _cwd = process.cwd();
      this.setCwd = function (cwd) { _cwd = path.resolve(_cwd, cwd); }
      this.getCwd = function () { return _cwd; }

      this.pathSep = path.sep;

      // var parentPath = util.splitPath(module.parent.filename);
      // module.parent.require = function(request, opts) {
      //   if (!opts) { opts = {}; }
      //   opts.dontExport = true;
      //   return _require({}, parentPath.directory, parentPath.filename, request, opts);
      // };

      this.log = function() {
        var msg;
        try {
          msg = Array.prototype.map.call(arguments, function(a) {
              if ((a instanceof Error) && a.message) {
                return 'Error:' + a.message + '\nStack:' + a.stack + '\nArguments:' + a.arguments;
              }
              return (typeof a == 'string' ? a : JSON.stringify(a));
            }).join(' ') + '\n';
        } catch(e) {
          msg = Array.prototype.join.call(arguments, ' ') + '\n';
        }

        process.stderr.write(msg);
        return msg;
      }

      this.getPath = function() {
        return __dirname;
      }

      this.eval = function (code, path) {
        return vm.runInThisContext(code, path, true);
      }

      this.fetch = function (p) {
        p = util.resolve(this.getCwd(), p);

        try {
          var dirname = path.dirname(p);
          var filename = path.basename(p);
          var lowerFilename = filename.toLowerCase();
          var files = fs.readdirSync(dirname);
        } catch (e) {
          return false;
        }

        for (var i = 0, testName; testName = files[i]; ++i) {
          if (testName.toLowerCase() == lowerFilename && testName != filename) {
            throw "Invalid case when importing [" + p + "].  You probably meant" + testName;
          }
        }

        try {
          return fs.readFileSync(p, 'utf8');
        } catch(e) {
          return false;
        }
      }

      var stackRe = /\((?!module.js)(?:file:\/\/)?(.*?)(:\d+)(:\d+)\)/g;
      this.loadModule = function (baseLoader, fromDir, fromFile, item, opts) {
        if (fromFile == INITIAL_FILE && !opts.initialImport) {
          var stack = new Error().stack;
          var match;
          stackRe.lastIndex = 0;
          do {
            match = stackRe.exec(stack);
          } while (match && /jsio\.js$/.test(match[1]));

          if (match) {
            fromDir = path.dirname(match[1]);
            fromFile = path.basename(match[1]);
          }
        }

        try {
          return baseLoader(null, fromDir, fromFile, item, opts);
        } catch(e) {
          if (e.code == MODULE_NOT_FOUND) {
            var require = req;
            // lookup node module for relative imports
            var module;
            var filename = path.join(fromDir, fromFile);
            module = this.requireCache[filename];
            if (!module) {
              module = new Module(filename);
              module.filename = filename;
              module.paths = Module._nodeModulePaths(path.dirname(filename));
            }
            var request = item.original || item.from;
            try {
              return {
                exports: module ? module.require(request) : require(request),
                path: item.from
              };
            } catch (e2) {
              if (e2.code == MODULE_NOT_FOUND) {
                throw e;
              }

              throw e2;
            }
          } else {
            throw e;
          }
        }
      }
    }

    function ENV_browser() {
      var XHR = window.XMLHttpRequest || function() { return new ActiveXObject("Msxml2.XMLHTTP"); },
        cwd = null,
        path = null,
        JOIN = Array.prototype.join;

      this.name = 'browser';
      this.global = window;
      this.pathSep = "/";

      if (!this.global.jsio) { this.global.jsio = jsio; }

      if (window.console && console.log) {
        if (!console.log.apply || /Android|iPhone|iPad|iPod/.test(navigator.userAgent)) {
          this.log = function () {
            var args = JOIN.call(arguments, ' ');
            console.log(args);
            return args;
          }
        } else {
          this.log = function () {
            console.log.apply(console, arguments);
            return JOIN.call(arguments, ' ');
          }
        }
      } else {
        this.log = function () { return JOIN.call(arguments, ' '); }
      }

      this.getCwd = function() {
        if(!cwd) {
          var loc = window.location, path = loc.pathname;
          cwd = loc.protocol + '//' + loc.host + path.substring(0, path.lastIndexOf('/') + 1);
        }
        return cwd;
      }

      this.getPath = function() {
        if(!path) {
          try {
            var filename = new RegExp('(.*?)' + jsio.__filename + '(\\?.*)?$'),
              scripts = document.getElementsByTagName('script');

            for (var i = 0, script; script = scripts[i]; ++i) {
              var result = script.src.match(filename);
              if (result) {
                path = result[1];
                if (/^[A-Za-z]*:\/\//.test(path)) { path = util.relative(this.getCwd(), path); }
                break;
              }
            }
          } catch(e) {}

          if(!path) { path = '.'; }
        }
        return path;
      }

      var debugHost = location.protocol + '//' + location.host + '/';
      var debugPath = location.pathname;
      this.debugPath = function (path) {
        return util.buildPath(debugHost, path[0] != '/' && debugPath, path);
      }

      // IE6 won't return an anonymous function from eval, so use the function constructor instead
      var rawEval = typeof eval('(function(){})') == 'undefined'
        ? function(src, path) { return (new Function('return ' + src))(); }
        : function(src, path) { var src = src + '\n//@ sourceURL=' + path; return window.eval(src); };

      // provide an eval with reasonable debugging
      this.eval = function(code, path, origCode) {
        try {
          return rawEval(code, this.debugPath(path));
        } catch(e) {
          if(e instanceof SyntaxError) {
            ENV.log("a syntax error is preventing execution of " + path);
            if (DEBUG && this.checkSyntax) {
              this.checkSyntax(origCode, path);
            }
          }
          throw e;
        }
      }

      this.checkSyntax = function(code, path) {
        try {
          var syntax = jsio('import .util.syntax', {suppressErrors: true, dontExport: true}),
            result = syntax(code);
          syntax.display(result, path);
        } catch(e) {}
      }

      this.fetch = function(path) {
        var xhr = new XHR();
        try {
          xhr.open('GET', path, false);
          xhr.send(null);
        } catch(e) {
          ENV.log('e:', e);
          return false; // firefox file://
        }

        if (xhr.status == 404 || // all browsers, http://
          xhr.status == -1100 || // safari file://
          // XXX: We have no way to tell in opera if a file exists and is empty, or is 404
          // XXX: Use flash?
          //(!failed && xhr.status == 0 && !xhr.responseText && EXISTS)) // opera
          false)
        {
          return false;
        }

        return xhr.responseText;
      }
    };

    var preprocessorCheck = /^"use (.*?)"\s*;\s*\n/,
      preprocessorFunc = /^(.+)\(.+\)$/,
      failedFetch = {};

    function findModule(possibilities, opts) {
      var src;
      for (var i = 0, possible; possible = possibilities[i]; ++i) {
        var path = possible.path,
          cachedVersion = srcCache[path];

        if (cachedVersion) {
          // extract a non-absolute dirname from the cache key: absolute paths
          // built into the cache are made relative during compile time since
          // absolute paths won't match between host and target device. Use
          // the cache key as the relative path so future imports can also
          // successfully lookup paths in the cache.
          var match = path.match(/^(.*\/)[^\\\/]+$/);
          possible.directory = match && match[1] || "";
          possible.src = cachedVersion.src;
          possible.pre = true;
          return possible;
        }

        /*if (/^\.\//.test(path)) {
          // remove one path segment for each dot from the cwd
          path = addEndSlash(ENV.getCwd()) + path;
        }*/

        src = ENV.fetch(path);

        if (src !== false) {
          possible.src = src;
          return possible;
        } else {
          failedFetch[path] = true;
        }
      }

      return false;
    }

    function processStack() {
      return importStack.map(function (item, index) {
        var stack = index == 0 ? new Error().stack : importStack[index - 1].stack;
        var i = stack.indexOf(item.path);
        if (i >= 0) {
          item.line = ':' + parseInt(stack.substring(i + item.path.length + 1));
        }

        return (index + 1) + ': "' + item.friendlyPath + '" ' + item.path + (item.line || '');
      });
    }

    // load a module from a file
    function loadModule (baseLoader, fromDir, fromFile, item, opts) {
      var modulePath = item.from;
      var possibilities = util.resolveModulePath(modulePath, fromDir);
      for (var i = 0, p; p = possibilities[i]; ++i) {
        var path = possibilities[i].path;
        if (!opts.reload && (path in jsio.__modules)) {
          return possibilities[i];
        }

        if (path in failedFetch) { possibilities.splice(i--, 1); }
      }

      if (!possibilities.length) {
        if (opts.suppressErrors) { return false; }
        var e = new Error('Could not import `' + item.from + '`'
            + "\tImport Stack:\n"
            + "\t\t" + processStack().join("\n\t\t"));
        e.jsioLogged = true;
        e.code = MODULE_NOT_FOUND;
        throw e;
      }

      var moduleDef = findModule(possibilities, opts),
        match;
      if (!moduleDef) {
        if (opts.suppressErrors) { return false; }
        var paths = [];
        for (var i = 0, p; p = possibilities[i]; ++i) { paths.push(p.path); }
        var e = new Error("Could not import `" + modulePath + "`\n"
          + "\tlooked in:\n"
            + "\t\t" + paths.join('\n\t\t') + "\n"
            + "\tImport Stack:\n"
            + "\t\t" + processStack().join("\n\t\t"));
        e.code = MODULE_NOT_FOUND;
        throw e;
      }

      // a (potentially) nicer way to refer to a module -- how it was referenced in code when it was first imported
      moduleDef.friendlyPath = modulePath;

      // cache the base module's path in the path cache so we don't have to
      // try out all paths the next time we see the same base module.
      if (moduleDef.baseMod && !(moduleDef.baseMod in jsioPath.cache)) {
        jsioPath.cache[moduleDef.baseMod] = moduleDef.basePath;
      }

      // don't apply the standard preprocessors to base.js.  If we're reloading
      // the source code, always apply them.  We also don't want to run them
      // if they've been run once -- moduleDef.pre is set to true already
      // if we're reading the code from the source cache.
      if (modulePath != 'base' && (opts.reload || !opts.dontPreprocess && !moduleDef.pre)) {
        moduleDef.pre = true;

        applyPreprocessors(fromDir, moduleDef, ["import", "inlineSlice"], opts);

        // the order here is somewhat arbitrary and might be overly restrictive (... or overly powerful)
        // while (moduleDef.src.charAt(0) == '"' && (match = moduleDef.src.match(preprocessorCheck))) {
        //  moduleDef.src = moduleDef.src.substring(match[0].length - 1);
        //  applyPreprocessors(fromDir, moduleDef, match[1].split(','), opts);
        // }
      }

      // any additional preprocessors?
      if (opts.preprocessors) {
        applyPreprocessors(fromDir, moduleDef, opts.preprocessors, opts);
      }

      return moduleDef;
    }

    function applyPreprocessors(path, moduleDef, names, opts) {
      for (var i = 0, len = names.length; i < len; ++i) {
        p = getPreprocessor(names[i]);

        // if we have a recursive import and p isn't a function, just
        // skip it (handles the case where a preprocessor imports
        // other modules).
        if (p && typeof p == 'function') {
          p(path, moduleDef, opts);
        }

      }
    }

    function getPreprocessor(name) {
      var module = jsio.__modules['.preprocessors.' + name];
      return typeof name == 'function'
        ? name
        : (module && module.exports
          || localJsio('import .preprocessors.' + name));
    }

    function execModuleDef(context, moduleDef) {
      var src = moduleDef.src;
      delete moduleDef.src;

      var code = "(function(_){with(_){delete _;return function $$" + moduleDef.friendlyPath.replace(/[\:\\\/.-]/g, '_') + "(){" + src + "\n}}})";

      var exports = moduleDef.exports = context.exports;

      var fn = ENV.eval(code, moduleDef.path, src);
      fn = fn(context);

      fn.call(exports);

      if (exports != context.module.exports) {
        // Emulate node.js-style ability to reassign module.exports:
        //   module.exports = ...
        //
        // Note that in node.js and js.io, setting `module.exports` invalidates
        // the context's `exports` alias. See
        // http://nodejs.org/api/modules.html#modules_exports_alias for more
        moduleDef.exports = context.module.exports;
      } else {
        // js.io-style ability to override exports directly (`exports = `)
        moduleDef.exports = context.exports;
      }
    };

    function resolveImportRequest(context, request, opts) {
      var cmds = jsio.__cmds,
        imports = [],
        result = false;

      for (var i = 0, imp; imp = cmds[i]; ++i) {
        if ((result = imp(context, request, opts, imports))) { break; }
      }

      if (result !== true) {
        throw new (typeof SyntaxError != 'undefined' ? SyntaxError : Error)(String(result || 'invalid jsio command: jsio(\'' + request + '\')'));
      }

      return imports;
    };

    function makeContext(ctx, modulePath, moduleDef, dontAddBase) {
      if (!ctx) { ctx = {}; }
      if (!ctx.exports) { ctx.exports = {}; }

      ctx.jsio = util.bind(this, _require, ctx, moduleDef.directory, moduleDef.filename);
      ctx.require = function(request, opts) {
        if (!opts) { opts = {}; }
        opts.dontExport = true;
        return ctx.jsio(request, opts);
      };

      ctx.require.main = ENV.main;

      ctx.module = {id: modulePath, exports: ctx.exports};
      if (!dontAddBase && modulePath != 'jsio.base') {
        ctx.jsio('from jsio.base import *', {dontPreprocess: true});
        ctx.logging.__create(modulePath, ctx);
      }

      // TODO: FIX for "trailing ." case
      ctx.jsio.__jsio = jsio;
      ctx.jsio.__env = jsio.__env;
      ctx.jsio.__dir = moduleDef.directory;
      ctx.jsio.__filename = moduleDef.filename;
      ctx.jsio.path = jsioPath;

      ctx.__dirname = moduleDef.directory;
      ctx.__filename = util.buildPath(ctx.__dirname, moduleDef.filename);
      return ctx;
    };

    var importStack = [];
    function _require(boundContext, fromDir, fromFile, request, opts) {
      opts = opts || {};
      fromDir = fromDir || './';
      fromFile = fromFile || INITIAL_FILE;

      // require is bound to a module's (or global) context -- we can override this
      // by using opts.exportInto
      var exportInto = opts.exportInto || boundContext || ENV.global;

      // parse the import request(s)
      var imports = resolveImportRequest(exportInto, request, opts),
        numImports = imports.length,
        retVal = numImports > 1 ? {} : null;

      // import each requested item
      for (var i = 0; i < numImports; ++i) {
        var item = imports[i];
        var modulePath = item.from;
        var modules = jsio.__modules;
        var path;
        var moduleDef;
        var err;

        try {
          moduleDef = jsio.__env.loadModule(loadModule, fromDir, fromFile, item, opts);
        } catch(e) {
          err = e;
        }

        if (moduleDef) {
          path = moduleDef.path;
        } else if (moduleDef == false) {
          return false;
        }

        if (err) {
          if (opts.suppressErrors) { return false; }
          if (!err.jsioLogged) {
            ENV.log(
              '\nError loading module:\n',
              '    [[', request, ']]\n',
              '    requested by:', fromDir + fromFile, '\n',
              '    current directory:', jsio.__env.getCwd(), '\n',
              '  ' + err.stack.split('\n').join('\n  '));
            err.jsioLogged = true;
          }

          throw err;
        }

        if (moduleDef) {
          importStack.push({
            friendlyPath: moduleDef.friendlyPath,
            path: moduleDef.path,
            stack: new Error().stack
          });
        }

        // eval any packages that we don't know about already
        if (!(path in modules)) {
          modules[path] = moduleDef;
        }

        if (!moduleDef.exports) {
          var newContext = makeContext(opts.context, modulePath, moduleDef, item.dontAddBase);
          if (item.dontUseExports) {
            var src = [';(function(){'], k = 1;
            for (var j in item['import']) {
              newContext.exports[j] = undefined;
              src[k++] = 'if(typeof '+j+'!="undefined"&&exports.'+j+'==undefined)exports.'+j+'='+j+';';
            }
            src[k] = '})();';
            moduleDef.src += src.join('');
          }

          execModuleDef(newContext, moduleDef);
        }

        importStack.pop();

        var module = moduleDef.exports;

        // return the module if we're only importing one module
        if (numImports == 1) { retVal = module; }

        if (!opts.dontExport) {
          // add the module to the current context
          if (item.as) {
            // remove trailing/leading dots
            var as = item.as.match(/^\.*(.*?)\.*$/)[1],
              segments = as.split('.'),
              kMax = segments.length - 1,
              c = exportInto;

            // build the object in the context
            for(var k = 0; k < kMax; ++k) {
              var segment = segments[k];
              if (!segment) continue;
              if (!c[segment]) { c[segment] = {}; }
              c = c[segment];
            }

            c[segments[kMax]] = module;

            // there can be multiple module imports with this syntax (import foo, bar)
            if (numImports > 1) {
              retVal[as] = module;
            }
          } else if (item['import']) {
            // there can only be one module import with this syntax
            // (from foo import bar), so retVal will already be set here
            if (item['import']['*']) {
              for (var k in modules[path].exports) { exportInto[k] = module[k]; }
            } else {
              for (var k in item['import']) { exportInto[item['import'][k]] = module[k]; }
            }
          }
        }
      }

      return retVal;
    }

    // DEFINE SYNTAX FOR JSIO('cmd')

    // from myPackage import myFunc
    // external myPackage import myFunc
    jsio.addCmd(function(context, request, opts, imports) {
      var match = request.match(/^\s*(from|external)\s+([\w.\-$]+)\s+(import|grab)\s+(.*)$/);
      if(match) {
        imports.push({
          from: match[2],
          dontAddBase: match[1] == 'external',
          dontUseExports: match[3] == 'grab' || match[1] == 'external',
          'import': {}
        });

        match[4].replace(/\s*([\w.\-$*]+)(?:\s+as\s+([\w.\-$]+))?/g, function(_, item, as) {
          imports[0]['import'][item] = as || item;
        });
        return true;
      }
    });

    // import myPackage
    jsio.addCmd(function(context, request, opts, imports) {
      var match = request.match(/^\s*import\s+(.*)$/);
      if (match) {
        match[1].replace(/\s*([\w.\-$]+)(?:\s+as\s+([\w.\-$]+))?,?/g, function(_, fullPath, as) {
          imports.push(
            as ? {
              from: fullPath,
              as: as
            } : {
              from: fullPath,
              as: fullPath
            });
        });
        return true;
      }
    });

    // CommonJS syntax
    jsio.addCmd(function(context, request, opts, imports) {

      //    ./../b -> ..b
      //    ../../b -> ...b
      //    ../b -> ..b
      //    ./b -> .b

      var match = request.match(/^\s*[\w.0-9$\/\-:\\]+\s*$/);
      if (match) {

        var req = util.resolveRelativePath(match[0]),
          isRelative = req.charAt(0) == '.';

        req = req
          // .replace(/^\//, '') // remove any leading slash
          .replace(/\.\.\//g, '.') // replace relative path indicators with dots
          .replace(/\.\//g, '')
          .replace(/\/+$/g, '');

        if (ENV.pathSep === '\\' && req.match(/^[a-zA-Z]:.*/)) {
          // leave absolute windows paths (start with drive letter) alone
        } else {
          // any remaining slashes are path separators
         req = req.replace(/\//g, '.');
        }

        imports[0] = { from: (isRelative ? '.' : '') + req, original: request };
        return true;
      }
    });

    jsio.install = function() {
      jsio('from .base import *');
      GLOBAL['logger'] = logging.get('jsiocore');
    };

    jsio.eval = function (src, path) {
      path = ENV.getCwd() || '/';
      var moduleDef = new ModuleDef(path);
      moduleDef.src = src;
      applyPreprocessors(path, moduleDef, ["import", "cls"], {});
      execModuleDef(ENV.global, moduleDef);
    };

    jsio.clone = util.bind(null, init, jsio);

    // in node, defines jsio as a module that can be imported
    var moduleInfo = util.resolveModulePath('jsio')[0];
    if (moduleInfo) {
      jsio.__modules[moduleInfo.path] = new ModuleDef(moduleInfo.path);
      jsio.__modules[moduleInfo.path].exports = jsio;
    }

    return jsio;
  }

  var J = init(null, {});
  if (typeof exports != 'undefined') {
    module.exports = J;
  } else {
    jsio = J;
  }
})();
