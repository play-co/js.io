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
;(function() {
	// We expect this code to be minified before production use, so we may
	// write code slightly more verbosely than we otherwise would.
	
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
	var rexpEndSlash = /\/$/;
	
	// Creates an object containing metadata about a module.
	function makeModuleDef(path, baseMod, basePath) {
		var def = util.splitPath(path + '.js');
		if (baseMod) {
			def.baseMod = baseMod;
			def.basePath = basePath;
		}
		return def;
	}
	
	// Utility functions
	var util = {
			// `util.bind` returns a function that, when called, will execute
			// the method passed in with the provided context and any additional
			// arguments passed to `util.bind`.
			//       util.bind(obj, 'f', a) -> function() { return obj.f(a); }
			//       util.bind(obj, g, a, b, c) -> function() { return g.call(g, a, b, c); }
			bind: function(context, method/*, args... */) {
				var args = SLICE.call(arguments, 2);
				return function() {
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
			
			// `util.makeRelativePath` accepts two paths (strings) and returns the first path
			// made relative to the second.  Note: this function needs some work.  It currently
			// handles the most common use cases, but may fail in unexpected edge cases.
			// 
			//  - Simple case: if `path` starts with `relativeTo`, then we can strip `path` 
			// off the `relativeTo` part and we're done.
			//
			//         util.makeRelativePath('abc/def/', 'abc') -> 'def'
			//
			//  - Harder case: `path` starts with some substring of `relativeTo`.  We want to remove this substring and then add `../` for each remaining segment of `relativeTo`.
			//
			//         util.makeRelativePath('abc/def/', 'abc/hij') -> '../def'
			//
			makeRelativePath: function(path, relativeTo) {
				var len = relativeTo.length;
				if (path.substring(0, len) == relativeTo) {
					/* Note: we're casting a boolean to an int by adding len to it */
					return path.slice((path.charAt(len) == '/') + len);
				}
				
				var sA = util.removeEndSlash(path).split('/'),
					sB = util.removeEndSlash(relativeTo).split('/'),
					i = 0;
				
				/* Count how many segments match. */
				while(sA[i] == sB[i]) { ++i; }
				
				if (i) {
					/* If at least some segments matched, remove them.  The result is our new path. */
					path = sA.slice(i).join('/');
					
					/* Prepend `../` for each segment remaining in `relativeTo`. */
					for (var j = sB.length - i; j > 0; --j) { path = '../' + path; }
				}
				
				return path;
			},
			
			// `buildPath` accepts an arbitrary number of string arguments to concatenate into a path.
			//     util.buildPath('a', 'b', 'c/', 'd/') -> 'a/b/c/d/'
			buildPath: function() {
				return util.resolveRelativePath(Array.prototype.join.call(arguments, '/'));
			},
			
			// `resolveRelativePath` removes relative path indicators.  For example:
			//     util.resolveRelativePath('a/../b') -> b
			resolveRelativePath: function(path) {
				/* If the path starts with a protocol, store it and remove it (add it
				   back later) so we don't accidently modify it. */
				var protocol = path.match(/^(\w+:\/\/)(.*)$/);
				if (protocol) { path = protocol[2]; }
				
				/* Remove multiple slashes and trivial dots (`/./ -> /`). */
				path = path.replace(/\/+/g, '/').replace(/\/\.\//g, '/');
				
				/* Loop to collapse instances of `../` in the path by matching a previous
				   path segment.  Essentially, we find substrings of the form `/abc/../`
				   where abc is not `.` or `..` and replace the substrings with `/`.
				   We loop until the string no longer changes since after collapsing all
				   possible instances once, we may have created more instances that can
				   be collapsed.
				*/
				var o;
				while((o = path) != (path = path.replace(/(^|\/)(?!\.?\.\/)([^\/]+)\/\.\.\//g, '$1'))) {}
				/* Don't forget to prepend any protocol we might have removed earlier. */
				return protocol ? protocol[1] + path : path;
			},
			
			resolveRelativeModule: function(modulePath, directory) {
				var result = [],
					parts = modulePath.split('.'),
					len = parts.length,
					relative = (len > 1 && !parts[0]),
					i = relative ? 0 : -1;
				
				while(++i < len) { result.push(parts[i] ? parts[i] : '..'); }
				return util.buildPath(relative ? directory : '', result.join('/'));
			},
			resolveModulePath: function(modulePath, directory) {
				// resolve relative paths
				if(modulePath.charAt(0) == '.') {
					return [makeModuleDef(util.resolveRelativeModule(modulePath, directory))];
				}
				
				// resolve absolute paths with respect to jsio packages/
				var pathSegments = modulePath.split('.'),
					baseMod = pathSegments[0],
					pathString = pathSegments.join('/');
				
				if (jsio.path.cache.hasOwnProperty(baseMod)) {
					return [makeModuleDef(util.buildPath(jsio.path.cache[baseMod], pathString))];
				}
				
				var out = [],
					paths = jsio.path.get(),
					len = paths.length;
				for (var i = 0; i < len; ++i) {
					out.push(makeModuleDef(util.buildPath(paths[i], pathString), baseMod, paths[i]));
				}
				return out;
			},
			splitPath: function(path) {
				var i = path.lastIndexOf('/') + 1;
				return {
					path: path,
					directory: path.substring(0, i),
					filename: path.substring(i)
				};
			}
		};
	
	var exports = jsio = util.bind(this, importer, null, null, null);
	exports.__util = util;
	exports.__init__ = arguments.callee;
	
	// explicitly use jsio.__srcCache to avoid obfuscation with closure compiler
	var sourceCache = jsio.__srcCache = {};
	
	(function() {
		this.__filename = 'jsio.js';
		this.__preprocessors = {};
		this.__cmds = [];
		this.__jsio = this;
		this.__importer = importer;
		this.__modules = {preprocessors:{}};
		
		this.path = {
			set: function(path) { this.value = (typeof path == 'string' ? [path] : path); },
			get: function() { return this.value.slice(0); },
			add: function(path) {
				var v = this.value, len = v.length;
				for (var i = 0; i < len; ++i) {
					if (v[i] == path) { return; }
				}
				v.push(path);
			},
			remove: function(path) {
				var v = this.value, len = v.length;
				for (var i = 0; i < len; ++i) {
					if (v[i] == path) {
						v.splice(i, 1);
					}
				}
			},
			value: [],
			cache: {}
		};
		
		this.addPath = util.bind(this.path, 'add');
		
		this.setCachedSrc = function(path, src) { sourceCache[path] = { path: path, src: src }; }
		this.getCachedSrc = function(path) { return sourceCache[path]; }
		
		this.addPreprocessor = function(name, preprocessor) { this.__preprocessors[name] = preprocessor; }
		this.addCmd = function(processor) { this.__cmds.push(processor); }
		
		this.setEnv = function(envCtor) {
			if(typeof envCtor == 'string') {
				switch(envCtor) {
					case 'node':
						ENV = new ENV_node(util);
						break;
					case 'browser':
					default:
						ENV = new ENV_browser(util);
						break;
				}
			} else {
				ENV = new envCtor(util);
			}
			
			this.__env = ENV;
			this.__dir = ENV.getCwd();
			this.path.set(ENV.getPath());
		}
	}).call(exports);
	
	if (typeof process !== 'undefined' && process.version) {
		jsio.setEnv('node');
	} else if (typeof XMLHttpRequest != 'undefined' || typeof ActiveXObject != 'undefined') {
		jsio.setEnv('browser');
	}
	
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
		var fs = require('fs'),
			sys = require('sys');
		
		this.name = 'node';
		this.global = GLOBAL;
		this.getCwd = process.cwd;
		this.log = function() {
			var msg;
			try {
				sys.error(msg = Array.prototype.map.call(arguments, function(a) {
					if ((a instanceof Error) && a.message) {
						return 'Error:' + a.message + '\nStack:' + a.stack + '\nArguments:' + a.arguments;
					}
					return typeof a == 'string' ? a : JSON.stringify(a);
				}).join(' '));
			} catch(e) {
				sys.error(msg = Array.prototype.join.call(arguments, ' ') + '\n');
			}
			return msg;
		}
		
		this.getPath = function() {
			var segments = __filename.split('/');
			segments.pop();
			return util.makeRelativePath(segments.join('/') || '.', this.getCwd());
		}
		this.eval = process.compile;
		
		this.fetch = function(path) {
			try { return fs.readFileSync(path, 'utf8'); } catch(e) {}
			return false;
		}
		
		this.require = require;
	}
	
	function ENV_browser() {
		var XHR = window.XMLHttpRequest || function() { return new ActiveXObject("Msxml2.XMLHTTP"); },
			cwd = null,
			path = null;
		
		this.name = 'browser';
		this.global = window;
		this.global.jsio = jsio;
		
		this.log = function() {
			var args = SLICE.call(arguments, 0);
			if (typeof console != 'undefined' && console.log) {
				if (console.log.apply) {
					console.log.apply(console, arguments);
				} else { // IE doesn't support log.apply, and the argument cannot be arguments - it must be an array
					console.log(args);
				}
			}
			return args.join(' ');
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
							if (/^[A-Za-z]*:\/\//.test(path)) { path = util.makeRelativePath(path, this.getCwd()); }
							break;
						}
					}
				} catch(e) {}
				
				if(!path) { path = '.'; }
			}
			return path;
		}
		
		this.debugPath = function(path) { return path; }

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
				var syntax = jsio('import util.syntax', {suppressErrors: true, dontExport: true}),
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
				cachedVersion = sourceCache[path];
			
			if (cachedVersion) {
				possible.src = cachedVersion.src;
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
	
	// load a module from a file
	function loadModule(fromDir, fromFile, modulePath, opts) {
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
			var e = new Error('Module failed to load (again)');
			e.jsioLogged = true;
			throw e;
		}
		
		var moduleDef = findModule(possibilities, opts),
			match;
		
		if (!moduleDef) {
			if (opts.suppressErrors) { return false; }
			var paths = [];
			for (var i = 0, p; p = possibilities[i]; ++i) { paths.push(p.path); }
			throw new Error('Error in ' + fromDir + fromFile + ": requested import (" + modulePath + ") not found.\n\tcurrent directory: " + ENV.getCwd() + "\n\tlooked in:\n\t\t" + paths.join('\n\t\t'));
		}
		
		moduleDef.friendlyPath = modulePath;
		
		if (moduleDef.baseMod && !(moduleDef.baseMod in jsio.path.cache)) {
			jsio.path.cache[moduleDef.baseMod] = moduleDef.basePath;
		}
		
		// the order here is somewhat arbitrary and might be overly restrictive (... or overly powerful)
		while (moduleDef.src.charAt(0) == '"' && (match = moduleDef.src.match(preprocessorCheck))) {
			moduleDef.src = moduleDef.src.substring(match[0].length - 1);
			applyPreprocessors(fromDir, moduleDef, match[1].split(','), opts);
		}
		
		if (opts.preprocessors) {
			applyPreprocessors(fromDir, moduleDef, opts.preprocessors, opts);
		}
		
		return moduleDef;
	}
	
	function applyPreprocessors(path, moduleDef, names, opts) {
		for (var i = 0, len = names.length; i < len; ++i) {
			p = getPreprocessor(names[i]);
			if (p) {
				p(path, moduleDef, opts);
			}
		}
	}
	
	function getPreprocessor(name) {
		return typeof name == 'function'
			? name
			: (jsio.__modules['preprocessors.' + name] 
				|| jsio('import preprocessors.' + name, {dontExport: true}));
	}
	
	function execModuleDef(context, moduleDef) {
		var code = "(function(_){with(_){delete _;return function $$" + moduleDef.friendlyPath.replace(/[\/.]/g, '_') + "(){" + moduleDef.src + "\n}}})";
		var fn = ENV.eval(code, moduleDef.path, moduleDef.src);
		try {
			fn = fn(context);
			fn.call(context.exports);
		} catch(e) {
			if(e.type == "syntax_error") {
				throw new Error("error importing module: " + e.message);
			} else if (!e.jsioLogged) {
				e.jsioLogged = true;
				if (e.type == "stack_overflow") {
					ENV.log("Stack overflow in", moduleDef.friendlyPath, ':', e);
				} else {
					ENV.log(e.stack);
					ENV.log(moduleDef.friendlyPath + ": enable 'break on error' in your debugger to debug. (" + moduleDef.path + ")");
//					if (ENV.name == 'browser') {
//						ENV.log(moduleDef.path + ':', e.message, "\n\n", e.stack.replace(new RegExp(util.resolveRelative(ENV.getCwd() + ENV.getPath() + '/jsio.js'), 'g'), ''));
//					}
				}
			}
			throw e;
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
	
	function makeContext(modulePath, moduleDef, dontAddBase) {
		var ctx = {exports: {}},
			cwd = ENV.getCwd();
		
		ctx.jsio = util.bind(this, importer, ctx, moduleDef.directory, moduleDef.filename);
		ctx.require = ENV.require ? ENV.require : function(request, opts) {
			opts.dontExport = true;
			return ctx.jsio(request, opts);
		};
		
		ctx.module = {id: modulePath};
		if (!dontAddBase && modulePath != 'base') {
			ctx.jsio('from base import *');
			ctx.logging.__create(modulePath, ctx);
		}
		
		// TODO: FIX for "trailing ." case
		ctx.jsio.__jsio = jsio;
		ctx.jsio.__env = jsio.__env;
		ctx.jsio.__dir = moduleDef.directory;
		ctx.jsio.__filename = moduleDef.filename;
		ctx.jsio.__path = modulePath;
		ctx.jsio.path = jsio.path;
		return ctx;
	};
	
	function importer(boundContext, fromDir, fromFile, request, opts) {
		opts = opts || {};
		fromDir = fromDir || './';
		fromFile = fromFile || '<initial file>';
		
		// importer is bound to a module's (or global) context -- we can override this
		// by using opts.context
		var context = opts.context || boundContext || ENV.global;
		
		// parse the import request(s)
		var imports = resolveImportRequest(context, request, opts),
			numImports = imports.length,
			retVal = numImports > 1 ? {} : null;
		
		// import each requested item
		for(var i = 0; i < numImports; ++i) {
			var item = imports[i],
				modulePath = item.from,
				modules = jsio.__modules;
			
			try {
				var moduleDef = loadModule(fromDir, fromFile, modulePath, opts);
				if (moduleDef === false) { return false; }
			} catch(e) {
				if (!e.jsioLogged) {
					ENV.log('\nError loading module:\n\trequested:', modulePath, '\n\tfrom:', fromDir + fromFile, '\n\tfull request:', request, '\n');
					e.jsioLogged = true;
				}
				throw e;
			}

			// eval any packages that we don't know about already
			var path = moduleDef.path;
			if(!(path in modules)) {
				var newContext = makeContext(modulePath, moduleDef, item.dontAddBase);
				modules[path] = newContext.exports;
				if(item.dontUseExports) {
					var src = [';(function(){'], k = 1;
					for (var j in item['import']) {
						newContext.exports[j] = undefined;
						src[k++] = 'if(typeof '+j+'!="undefined"&&exports.'+j+'==undefined)exports.'+j+'='+j+';';
					}
					src[k] = '})();';
					moduleDef.src += src.join('');
				}
				execModuleDef(newContext, moduleDef);
				modules[path] = newContext.exports;
			}
			
			var module = modules[path];
			
			// return the module if we're only importing one module
			if (numImports == 1) { retVal = module; }
			
			if (!opts.dontExport) {
				// add the module to the current context
				if (item.as) {
					// remove trailing/leading dots
					var as = item.as.match(/^\.*(.*?)\.*$/)[1],
						segments = as.split('.'),
						kMax = segments.length - 1,
						c = context;
				
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
				} else if(item['import']) {
					// there can only be one module import with this syntax 
					// (from foo import bar), so retVal will already be set here
					if(item['import']['*']) {
						for(var k in modules[path]) { context[k] = module[k]; }
					} else {
						try {
							for(var k in item['import']) { context[item['import'][k]] = module[k]; }
						} catch(e) {
							ENV.log('module: ', modules);
							throw e;
						}
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
		var match = request.match(/^\s*(from|external)\s+([\w.$]+)\s+(import|grab)\s+(.*)$/);
		if(match) {
			imports.push({
				from: match[2],
				dontAddBase: match[1] == 'external',
				dontUseExports: match[3] == 'grab' || match[1] == 'external',
				'import': {}
			});
			
			match[4].replace(/\s*([\w.$*]+)(?:\s+as\s+([\w.$]+))?/g, function(_, item, as) {
				imports[0]['import'][item] = as || item;
			});
			return true;
		}
	});

	// import myPackage
	jsio.addCmd(function(context, request, opts, imports) {
		var match = request.match(/^\s*import\s+(.*)$/);
		if (match) {
			match[1].replace(/\s*([\w.$]+)(?:\s+as\s+([\w.$]+))?,?/g, function(_, fullPath, as) {
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
		var match = request.match(/^\s*[\w.0-9$\/]+\s*$/);
		if(match) {
			var req = match[0]
				.replace(/^\//, '') // remove any leading slash
				.replace(/\.\.?\//g, '.') // replace relative path indicators with dots
				.replace(/\//g, '.'); // any remaining slashes are path separators
			
			imports[0] = { from: req };
			return true;
		}
	});
})();
