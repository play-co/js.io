// jsio/browser.js

;(function() {
	var SLICE = Array.prototype.slice,
		ENV,
		sourceCache = {
			// Insert pre-loaded modules here...
		},
		bind = function(context, method/*, args... */) {
			var args = Array.prototype.slice.call(arguments, 2);
			return function(){
				method = (typeof method == 'string' ? context[method] : method);
				return method.apply(context, args.concat(Array.prototype.slice.call(arguments, 0)));
			}
		},
		rexpEndSlash = /\/$/;
	
	function addEndSlash(str) { return rexpEndSlash.test(str) ? str : str + '/'; }
	function removeEndSlash(str) { return str.replace(rexpEndSlash, ''); }
	function makeRelativePath(path, relativeTo) {
		var i = path.match('^' + relativeTo);
		if (i && i[0] == relativeTo) {
			var offset = path[relativeTo.length] == '/' ? 1 : 0
			return path.slice(relativeTo.length + offset);
		}
		
		var sA = removeEndSlash(path).split('/'),
			sB = removeEndSlash(relativeTo).split('/'),
			i = 0;

		while(sA[i] == sB[i]) { ++i; }
		if (i) {
			path = sA.slice(i).join('/');
			for (var j = sB.length - i; j > 0; --j) { path = '../' + path; }
		}
		
		return path;
	};
	
	function resolveRelative(path) {
		do {
			var oldPath = path;
		} while(oldPath != (path = path.replace(/(^|\/)([^\/]+)\/\.\.\//g, '/')));
		return path;
	}
	
	(function() {
		this.__filename = 'jsio.js';
		this.__preprocessors = {};
		this.__cmds = [];
		this.__jsio = this;
		this.__importer = importer;
		this.__modules = {preprocessors:{}};
		
		this.setCachedSrc = function(filePath, src) { sourceCache[filePath] = { filePath: filePath, src: src }; }
		this.getCachedSrc = function(filePath) { return sourceCache[filePath]; }
		
		this.__path = {__default__:[]};
		this.setPath = function(path) { this.__path.__default__ = typeof path == 'string' ? [path] : path; }
		this.addPath = function(path, baseModule) {
			if (baseModule) {
				jsio.__path[baseModule] = path;
			} else {
				jsio.__path.__default__.push(path);
			}
		}
		
		this.addPreprocessor = function(name, preprocessor) { this.__preprocessors[name] = preprocessor; }
		this.addCmd = function(processor) { this.__cmds.push(processor); }
		
		this.setEnv = function(env) {
			if(ENV && (env == ENV || env == ENV.name)) { return; }

			if(typeof env == 'string') {
				switch(env) {
					case 'node':
						ENV = new ENV_node();
						break;
					case 'browser':
					default:
						ENV = new ENV_browser();
						break;
				}
			} else {
				ENV = env;
			}

			jsio.__env = ENV;
			jsio.__dir = ENV.getCwd();
			if(!jsio.__path.__default__.length) { jsio.setPath(ENV.getPath()); }
		}
	}).call(jsio = bind(this, importer, null, ''));
	
	jsio.__init__ = arguments.callee;
	
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
		this.hasCommonJS = true;
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
			return makeRelativePath(segments.join('/') || '.', this.getCwd());
		}
		this.eval = process.compile;
		
		this.fetch = function(path) {
			try { return fs.readFileSync(path, 'utf8'); } catch(e) {}
			return false;
		}
		
		this.require = require;
		this.include = include;
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
				var location = window.location.toString().split('#')[0];
				cwd = location.substring(0, location.lastIndexOf('/') + 1);
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
							if (/^[A-Za-z]*:\/\//.test(path)) { path = makeRelativePath(path, this.getCwd()); }
							break;
						}
					}
				} catch(e) {}
				
				if(!path) { path = '.'; }
			}
			return path;
		}

		// IE6 won't return an anonymous function from eval, so use the function constructor instead
		var rawEval = typeof eval('(function(){})') == 'undefined'
			? function(src, path) { return (new Function('return ' + src))(); }
			: function(src, path) { var src = src + '\n//@ sourceURL=' + path; return window.eval(src); }

		// provide an eval with reasonable debugging
		this.eval = function(code, path) {
			try { return rawEval(code, path); } catch(e) {
				if(e instanceof SyntaxError) {
					ENV.log("a syntax error is preventing execution of " + path);
					try {
						var cb = function() {
							var el = document.createElement('iframe');
							el.style.cssText = "position:absolute;top:-999px;left:-999px;width:1px;height:1px;visibility:hidden";
							el.src = 'javascript:document.open();document.write(window.parent.CODE_WITH_ERROR)';
							window.CODE_WITH_ERROR = "<scr"+"ipt>" + code + "</scr"+"ipt>"
							setTimeout(function() {try{document.body.appendChild(el)}catch(e){}}, 0);
						};
						if (document.body) { cb(); }
						else { window.addEventListener('load', cb, false); }
					} catch(f) {}
				}
				throw e;
			}
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
	
	function guessModulePath(pathString) {
		// resolve relative paths
		if(pathString.charAt(0) == '.') {
			// count the number of dots
			var prefix = './',
				i = 0;
			while (pathString.charAt(++i) == '.') { prefix += '../'; }
			return [{filePath: prefix + pathString.substring(i).split('.').join('/') + '.js'}];
		}
		
		// resolve absolute paths with respect to jsio packages/
		var pathSegments = pathString.split('.'),
			baseMod = pathSegments[0],
			modPath = pathSegments.join('/');
		
		if (baseMod in jsio.__path) {
			return [{filePath: addEndSlash(jsio.__path[baseMod]) + modPath + '.js'}];
		}
		
		var out = [],
			paths = jsio.__path.__default__;
		for (var i = 0, len = paths.length; i < len; ++i) {
			var path = addEndSlash(paths[i]);
			out.push({filePath: path + modPath + '.js', baseMod: baseMod, basePath: path});
		}
		return out;
	}
	
	var preprocessorCheck = /^"use (.*?)"\s*;\s*\n/,
		preprocessorFunc = /^(.+)\(.+\)$/;
	
	function findModule(possibilities) {
		var src;
		for (var i = 0, possible; possible = possibilities[i]; ++i) {
			var path = possible.filePath,
				cachedVersion = sourceCache[path];
			
			if (cachedVersion) { return cachedVersion; }

			/*if (/^\.\//.test(path)) {
				// remove one path segment for each dot from the cwd 
				path = addEndSlash(ENV.getCwd()) + path;
			}*/
			
			src = ENV.fetch(path);
			
			if (src !== false) {
				possible.src = src;
				return possible;
			}
		}
		return false;
	}
	
	// load a module from a file
	function loadModule(path, modulePath, opts) {
		var possibilities = guessModulePath(modulePath),
			moduleDef = findModule(possibilities),
			match;
		
		if (!moduleDef) {
			var paths = [];
			for (var i = 0, p; p = possibilities[i]; ++i) { paths.push(p.filePath); }
			throw new Error('Error in ' + path + ": requested import (" + modulePath + ") not found.\n\tlooked in:\n\t\t" + paths.join('\n\t\t'));
		}
		
		moduleDef.path = modulePath;
		
		if (moduleDef.baseMod && !(moduleDef.baseMod in jsio.__path)) {
			jsio.addPath(moduleDef.basePath, moduleDef.baseMod);
		}
		
		// the order here is somewhat arbitrary and might be overly restrictive (... or overly powerful)
		while (moduleDef.src.charAt(0) == '"' && (match = moduleDef.src.match(preprocessorCheck))) {
			moduleDef.src = moduleDef.src.substring(match[0].length - 1);
			applyPreprocessors(path, moduleDef, match[1].split(','), opts);
		}
		
		if (opts.preprocessors) {
			applyPreprocessors(path, moduleDef, opts.preprocessors, opts);
		}
		
		// required for jsjsiocompile
		if (modulePath == 'base') { jsio.__baseFile = moduleDef.filePath; }
		
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
		var modName = 'preprocessors.' + name;
		return typeof name == 'function' ? name : jsio.__modules[modName] || jsio('import preprocessors.' + name, {dontExport: true});
	}
	
	function execModuleDef(context, moduleDef) {
		var code = "(function(_){with(_){delete _;return function " + moduleDef.path.replace(/\./g, '$') + "(){" + moduleDef.src + "\n}}})";
		var fn = ENV.eval(code, moduleDef.filePath);
		try {
			fn = fn(context);
			fn.name = moduleDef.path;
			fn.call(context.exports);
		} catch(e) {
			if(e.type == "syntax_error") {
				throw new Error("error importing module: " + e.message);
			} else if (!e.jsioLogged) {
				e.jsioLogged = true;
				if (e.type == "stack_overflow") {
					ENV.log("Stack overflow in", moduleDef.filePath, ':', e);
				} else {
					ENV.log("ERROR LOADING", moduleDef.filePath);
//					if (ENV.name == 'browser') {
//						ENV.log(moduleDef.filePath + ':', e.message, "\n\n", e.stack.replace(new RegExp(resolveRelative(ENV.getCwd() + ENV.getPath() + '/jsio.js'), 'g'), ''));
//					}
				}
			}
			throw e;
		}
	};
	
	function resolveRelativePath(modulePath, path, pathSep) {
		// does the modulePath need to be resolved, i.e. is it a relative path?
		if(!path || (pathSep = pathSep || '.') != modulePath.charAt(0)) { return modulePath; }
		path += '.' + modulePath;
		do {
			var oldPath = path;
		} while(oldPath != (path = path.replace(/\.[^.]+\.\./g, '.')));
		return path;
	}
	
	function resolveImportRequest(context, path, request, opts) {
		var cmds = jsio.__cmds,
			imports = [],
			result = false;
		
		for (var i = 0, imp; imp = cmds[i]; ++i) {
			if ((result = imp(context, path, request, opts, imports))) { break; }
		}
		
		if (result !== true) {
			throw new (typeof SyntaxError != 'undefined' ? SyntaxError : Error)(String(result) || 'invalid jsio command: jsio(\'' + request + '\')');
		}
		
		return imports;
	};
	
	function makeContext(modulePath, filePath, dontAddBase) {
		var ctx = {exports: {}},
			cwd = ENV.getCwd(),
			i = filePath.lastIndexOf('/'),
			isRelative = i > 0;
		
		ctx.jsio = bind(this, importer, ctx, modulePath);
		if (!ENV.hasCommonJS) {
			ctx.require = function(request, opts) {
				opts.dontExport = true;
				return ctx.jsio(request, opts);
			};
		}
		
		ctx.module = {id: modulePath};
		if (!dontAddBase && modulePath != 'base') {
			ctx.jsio('from base import *');
			ctx.logging.__create(modulePath, ctx);
		}
		
		// TODO: FIX for "trailing ." case
		ctx.jsio.__jsio = jsio;
		ctx.jsio.__env = jsio.__env;
		ctx.jsio.__dir = isRelative ? makeRelativePath(filePath.substring(0, i), cwd) : '';
		ctx.jsio.__filename = isRelative ? filePath.substring(i) : filePath;
		ctx.jsio.__path = modulePath;
		return ctx;
	};
	
	function importer(context, path, request, opts) {
		opts = opts || {};
		
		// importer is bound to a module's (or global) context -- we can override this
		// by using opts.context
		context = opts.context || context || ENV.global;
		
		// parse the import request(s)
		var imports = resolveImportRequest(context, path, request, opts),
			numImports = imports.length,
			retVal = numImports > 1 ? {} : null;
		
		// import each requested item
		for(var i = 0; i < numImports; ++i) {
			var item = imports[i],
				modulePath = item.from,
				modules = jsio.__modules;
			
			// eval any packages that we don't know about already
			if(!(modulePath in modules)) {
				try {
					//ENV.log('loadModule base path: ' + path + ', module path: ', modulePath);
					var moduleDef = loadModule(path, modulePath, opts);
				} catch(e) {
					ENV.log('\nError loading module:\n\trequested:', modulePath, '\n\tfrom:', path, '\n\tfull request:', request, '\n');
					e.jsioLogged = true;
					throw e;
				}
				
				var newContext = makeContext(modulePath, moduleDef.filePath, item.external);
				modules[modulePath] = newContext.exports;
				if(item.external || item.grab) {
					var src = [';(function(){'], k = 1;
					for (var j in item['import']) {
						newContext.exports[j] = undefined;
						src[k++] = 'if(typeof '+j+'!="undefined"&&exports.'+j+'==undefined)exports.'+j+'='+j+';';
					}
					src[k] = '})();';
					moduleDef.src += src.join('');
				}
				execModuleDef(newContext, moduleDef);
				modules[modulePath] = newContext.exports;
			}
			
			var module = modules[modulePath];
			
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
						for(var k in modules[modulePath]) { context[k] = module[k]; }
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
	jsio.addCmd(function(context, path, request, opts, imports) {
		var match = request.match(/^\s*(from|external)\s+([\w.$]+)\s+(import|grab)\s+(.*)$/);
		if(match) {
			imports.push({
				from: resolveRelativePath(match[2], path),
				external: match[1] == 'external',
				grab: match[3] == 'grab',
				'import': {}
			});

			match[4].replace(/\s*([\w.$*]+)(?:\s+as\s+([\w.$]+))?/g, function(_, item, as) {
				imports[0]['import'][item] = as || item;
			});
			return true;
		}
	});

	// import myPackage
	jsio.addCmd(function(context, path, request, opts, imports) {
		var match = request.match(/^\s*import\s+(.*)$/);
		if (match) {
			match[1].replace(/\s*([\w.$]+)(?:\s+as\s+([\w.$]+))?,?/g, function(_, modulePath, as) {
				fullPath = resolveRelativePath(modulePath, path);
				imports.push(as ? {from: fullPath, as: as} : {from: fullPath, as: modulePath});
			});
			return true;
		}
	});

	// CommonJS syntax
	jsio.addCmd(function(context, path, request, opts, imports) {
		var match = request.match(/^\s*[\w.0-9$\/]+\s*$/);
		if(match) {
			var req = match[0],
				isAbsolute = req.charAt(0) == '/';
			
			req = req.replace(/^\//, '') // leading slash not needed
				.replace(/\.\.?\//g, '.') // replace relative path indicators with dots
				.replace(/\//g, '.'); // any remaining slashes are path separators

			// isAbsolute handles the edge case where the path looks like /../foo
			imports[0] = {
				from: isAbsolute ? req : resolveRelativePath(req, path)
			};
			
			return true;
		}
	});
})();
