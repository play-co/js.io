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
		};
	
	(function() {
		this.__filename = 'jsio.js';
		this.__preprocessors = {};
		this.__cmds = [];
		this.__jsio = this;
		
		this.modules = {preprocessors:{}};
		this.frameworks = [];
		
		this.setCachedSrc = function(pkg, filePath, src) { sourceCache[pkg] = { filePath: filePath, src: src }; }
		this.getCachedSrc = function(pkg) { return sourceCache[pkg]; }
		
		this.addFramework = function(name, init) { this.frameworks[name] = init; }
		
		this.path = {__default__:[]};
		this.setPath = function(path) { this.path.__default__ = typeof path == 'string' ? [path] : path; }
		this.addPath = function(path, baseModule) {
			if (baseModule) {
				jsio.path[baseModule] = path;
			} else {
				jsio.path.__default__.push(path);
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
			if(!jsio.path.__default__.length) { jsio.setPath(ENV.getPath()); }
		}
	}).call(jsio = bind(this, importer, null, ''));
	
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
			return segments.join('/') || '.';
		}
		this.eval = process.compile;
		
		this.fetch = function(filePath) {
			try {
				return fs.readFileSync(filePath);
			} catch(e) {}
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
					e.message = "a syntax error is preventing execution of " + path;
					e.type = "syntax_error";
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
		
		this.fetch = function(filePath) {
			var xhr = new XHR();
			try {
				xhr.open('GET', filePath, false);
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
	
	function ensureHasTrailingSlash(str) { return str.length && str.replace(/([^\/])$/, '$1/') || str; }
	function removeTrailingSlash(str) { return str.replace(/\/$/,''); }
	
	function guessModulePath(pathString) {
		// resolve relative paths
		if(pathString.charAt(0) == '.') {
			// count the number of dots
			var i = 0;
			while(pathString.charAt(i + 1) == '.') { ++i; }

			// remove one path segment for each dot from the cwd 
			var prefix = removeTrailingSlash(ENV.getCwd());
			if (i) { prefix = prefix.split('/').slice(0, -i).join('/'); }
			
			return [{filePath: prefix + '/' + pathString.substring(i + 1).split('.').join('/') + '.js'}];
		}
		
		// resolve absolute paths with respect to jsio packages/
		var pathSegments = pathString.split('.'),
			baseMod = pathSegments[0],
			modPath = pathSegments.join('/');
		
		if (baseMod in jsio.path) {
			return [{filePath: ensureHasTrailingSlash(jsio.path[baseMod]) + modPath + '.js'}];
		}
		
		var out = [],
			paths = jsio.path.__default__;
		for (var i = 0, len = paths.length; i < len; ++i) {
			var path = ensureHasTrailingSlash(paths[i]);
			out.push({filePath: path + modPath + '.js', baseMod: baseMod, basePath: path});
		}
		return out;
	}
	
	var preprocessorCheck = /^"use (.*?)"\s*;\s*\n/,
		preprocessorFunc = /^(.+)\(.+\)$/;
	
	function findModule(possibilities) {
		var src;
		for (var i = 0, possible; possible = possibilities[i]; ++i) {
			src = ENV.fetch(possible.filePath);
			if (src !== false) {
				possible.src = src;
				return possible;
			}
		}
		return false;
	}
	
	// load a module from a file
	function loadModule(pathString, opts) {
		var possibilities = guessModulePath(pathString),
			moduleDef = findModule(possibilities),
			match;
		
		if(!moduleDef) {
			var paths = [];
			for (var i = 0, p; p = possibilities[i]; ++i) { paths.push(p.filePath); }
			throw new Error("Module not found: " + pathString + " (looked in " + paths.join(', ') + ")");
		}
		
		if (moduleDef.baseMod && !(moduleDef.baseMod in jsio.path)) {
			jsio.addPath(moduleDef.basePath, moduleDef.baseMod);
		}
		
		if (opts.preprocessors) {
			applyPreprocessors(moduleDef, opts.preprocessors, opts);
		}
		
		while (moduleDef.src.charAt(0) == '"' && (match = moduleDef.src.match(preprocessorCheck))) {
			moduleDef.src = moduleDef.src.substring(match[0].length - 1);
			applyPreprocessors(moduleDef, match[1].split(','), opts);
		}
		
		return moduleDef;
	}
	
	function applyPreprocessors(moduleDef, names, opts) {
		for (var i = 0, len = names.length; i < len; ++i) {
			p = getPreprocessor(names[i]);
			if (p) {
				moduleDef.src = p(moduleDef.src, opts);
			}
		}
	}
	
	function getPreprocessor(name) {
		return jsio.modules.preprocessors[name] || jsio('import preprocessors.' + name, {dontExport: true});
	}
	
	function execModuleDef(context, moduleDef) {
		var code = "(function(_){with(_){delete _;(function(){" + moduleDef.src + "\n}).call(this)}})";
		var fn = ENV.eval(code, moduleDef.filePath);
		try {
			fn.call(context.exports, context);
		} catch(e) {
			if(e.type == "syntax_error") {
				throw new Error("error importing module: " + e.message);
			} else if (!e.jsioLogged) {
				e.jsioLogged = true;
				if (e.type == "stack_overflow") {
					ENV.log("Stack overflow in", moduleDef.filePath, ':', e);
				} else {
					ENV.log("ERROR LOADING", moduleDef.filePath, ENV.name == 'browser' ? e : '');
				}
			}
			throw e;
		}
	};
	
	function resolveRelativePath(pkg, path, pathSep) {
		// does the pkg need to be resolved, i.e. is it a relative path?
		if(!path || (pathSep = pathSep || '.') != pkg.charAt(0)) { return pkg; }
		
		var i = 1;
		while(pkg.charAt(i) == pathSep) { ++i; }
		path = path.split(pathSep).slice(0, -i);
		if(path.length) {
			path = path.join(pathSep);
			if(path.charAt(path.length - 1) != pathSep) { path += pathSep; }
		}
		return path + pkg.substring(i);
	}
	
	function resolveImportRequest(context, path, request, opts) {
		var cmds = jsio.__cmds,
			imports = [],
			result = false;
		
		for (var i = 0, imp; imp = cmds[i]; ++i) {
			if ((result = imp(context, path, request, opts, imports))) { break; }
		}
		
		if (result !== true) {
			throw new (typeof SyntaxError != 'undefined' ? SyntaxError : Error)(result || 'invalid jsio command: jsio(\'' + request + '\')');
		}
		
		return imports;
	};
	
	function makeContext(pkgPath, filePath, dontAddBase) {
		var ctx = {exports: {}},
			cwd = ENV.getCwd(),
			i = filePath.lastIndexOf('/'),
			isRelative = i > 0;
		
		ctx.jsio = bind(this, importer, ctx, pkgPath);
		ctx.require = function(request, opts) {
			opts.dontExport = true;
			return ctx.jsio(request, opts);
		};
		
		ctx.module = {id: pkgPath};
		if (!dontAddBase && pkgPath != 'base') {
			ctx.jsio('from base import *');
			//importer(ctx, pkgPath, {from:})
			ctx.logging.__create(pkgPath, ctx);
		}
		
		// TODO: FIX for "trailing ." case
		ctx.jsio.__jsio = jsio;
		ctx.jsio.__env = jsio.__env;
		ctx.jsio.__dir = isRelative ? makeRelativePath(filePath.substring(0, i), cwd) : '';
		ctx.jsio.__filename = isRelative ? filePath.substring(i) : filePath;
		ctx.jsio.__path = pkgPath;
		return ctx;
	};
	
	function makeRelativePath(path, relativeTo) {
		var i = path.match('^' + relativeTo);
		if (i && i[0] == relativeTo) {
			var offset = path[relativeTo.length] == '/' ? 1 : 0
			return path.slice(relativeTo.length + offset);
		}
		return path;
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
				pkg = item.from,
				modules = jsio.modules;
			
			// eval any packages that we don't know about already
			if(!(pkg in modules)) {
				try {
					var moduleDef = sourceCache[pkg] || loadModule(pkg, opts);
				} catch(e) {
					ENV.log('\nError executing \'', request, '\': could not load module', pkg, '\n\tpath:', path, '\n\trequest:', request, '\n');
					throw e;
				}
				
				var newContext = makeContext(pkg, moduleDef.filePath, item.external);
				modules[pkg] = newContext.exports;
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
				modules[pkg] = newContext.exports;
			}
			
			var module = modules[pkg];
			
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
						for(var k in modules[pkg]) { context[k] = module[k]; }
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
			match[1].replace(/\s*([\w.$]+)(?:\s+as\s+([\w.$]+))?,?/g, function(_, pkg, as) {
				fullPkg = resolveRelativePath(pkg, path);
				imports.push(as ? {from: fullPkg, as: as} : {from: fullPkg, as: pkg});
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
