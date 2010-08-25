// jsio/browser.js

;(function() {
	var ENV, sourceCache = {
		// Insert pre-loaded modules here...
		
	};
	
	function bind(context, method/*, args... */) {
		var args = Array.prototype.slice.call(arguments, 2);
		return function(){
			method = (typeof method == 'string' ? context[method] : method);
			return method.apply(context, args.concat(Array.prototype.slice.call(arguments, 0)));
		}
	}
	
	jsio = bind(this, importer, null, '');
	jsio.__filename = 'jsio.js';
	jsio.modules = [];
	jsio.setCachedSrc = function(pkg, filePath, src) {
		sourceCache[pkg] = { filePath: filePath, src: src };
	}
	jsio.getCachedSrc = function(pkg) { return sourceCache[pkg]; }
	jsio.path = {};
	jsio.setPath = function(path) { jsio.path.__default__ = typeof path == 'string' ? [path] : path; }
	jsio.setEnv = function(env) {
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
			ENV.name = env;
		} else {
			ENV = env;
		}
		
		jsio.__env = ENV;
		jsio.__dir = ENV.getCwd();
		if(!jsio.path.__default__) { jsio.setPath(ENV.getPath()); }
	}
	
	if (typeof process !== 'undefined' && process.version) {
		jsio.setEnv('node');
	} else if (typeof XMLHttpRequest != 'undefined' || typeof ActiveXObject != 'undefined') {
		jsio.setEnv('browser');
	}
	
	// DONE
	
	/*
	function ENV_abstract() {
		this.global = null;
		this.getCwd = function() {};
		this.getPath = function() {};
		this.eval = function(code, path) {};
		this.findModule = function(pathString) {};
		this.log = function(args...) {};
	}
	*/
	
	function ENV_node() {
		var fs = require('fs'),
			sys = require('sys');
		
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
		this.findModule = function(possibilities) {
			for (var i = 0, possible; possible = possibilities[i]; ++i) {
				try {
					possible.src = fs.readFileSync(possible.filePath);
					return possible;
				} catch(e) {
				}
			}
			return false;
		}

		this.require = require;
		this.include = include;
	}
	
	function ENV_browser() {
		var XHR = window.XMLHttpRequest || function() { return new ActiveXObject("Msxml2.XMLHTTP"); },
			SLICE = Array.prototype.slice,
			cwd = null,
			path = null;
		
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
							el.src = 'javascript:document.open();document.write("<scr"+"ipt src=\'' + path + '\'></scr"+"ipt>")';
							setTimeout(function() {try{document.body.appendChild(el)}catch(e){}}, 0);
						};
						if (document.body) { cb(); }
						else { window.addEventListener('load', cb, false); }
					} catch(f) {}
				}
				throw e;
			}
		}
		
		this.findModule = function(possibilities) {
			for (var i = 0, possible; possible = possibilities[i]; ++i) {
				var xhr = new XHR();
				try {
					xhr.open('GET', possible.filePath, false);
					xhr.send(null);
				} catch(e) {
					ENV.log('e:', e);
					continue; // firefox file://
				}
				
				if (xhr.status == 404 || // all browsers, http://
					xhr.status == -1100 || // safari file://
					// XXX: We have no way to tell in opera if a file exists and is empty, or is 404
					// XXX: Use flash?
					//(!failed && xhr.status == 0 && !xhr.responseText && EXISTS)) // opera
					false)
				{
					continue;
				}
				
				possible.src = xhr.responseText;
				return possible;
			}
			
			return false;
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
		
		var out = [];
		var paths = typeof jsio.path.__default__ == 'string' ? [jsio.path.__default__] : jsio.path.__default__;
		for (var i = 0, len = paths.length; i < len; ++i) {
			var path = ensureHasTrailingSlash(paths[i]);
			out.push({filePath: path + modPath + '.js', baseMod: baseMod, basePath: path});
		}
		return out;
	}
	
	// load a module from a file
	function loadModule(pathString) {
		var possibilities = guessModulePath(pathString),
			module = ENV.findModule(possibilities);
		if(!module) {
			var paths = [];
			for (var i = 0, p; p = possibilities[i]; ++i) { paths.push(p.filePath); }
			throw new Error("Module not found: " + pathString + " (looked in " + paths.join(', ') + ")");
		}
		
		if (!(module.baseMod in jsio.path)) {
			jsio.path[module.baseMod] = module.basePath;
		}
		
		return module;
	}
	
	function execModule(context, module) {
		var code = "(function(_){with(_){delete _;(function(){" + module.src + "\n}).call(this)}})";
		var fn = ENV.eval(code, module.filePath);
		try {
			fn.call(context.exports, context);
		} catch(e) {
			if(e.type == "syntax_error") {
				throw new Error("error importing module: " + e.message);
			} else if (!e.jsioLogged) {
				e.jsioLogged = true;
				if (e.type == "stack_overflow") {
					ENV.log("Stack overflow in", module.filePath, ':', e);
				} else {
					ENV.log("ERROR LOADING", module.filePath, ':', e);
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
	
	function resolveImportRequest(path, request) {
		var match, imports = [];
		if((match = request.match(/^(from|external)\s+([\w.$]+)\s+import\s+(.*)$/))) {

			imports[0] = {
				from: resolveRelativePath(match[2], path),
				external: match[1] == 'external',
				'import': {}
			};
			
			match[3].replace(/\s*([\w.$*]+)(?:\s+as\s+([\w.$]+))?/g, function(_, item, as) {
				imports[0]['import'][item] = as || item;
			});
		} else if((match = request.match(/^import\s+(.*)$/))) {
			match[1].replace(/\s*([\w.$]+)(?:\s+as\s+([\w.$]+))?,?/g, function(_, pkg, as) {
				fullPkg = resolveRelativePath(pkg, path);
				imports[imports.length] = as ? {from: fullPkg, as: as} : {from: fullPkg, as: pkg};
			});
		} else if((match = request.match(/[\w.0-9$\/]/))) { // CommonJS syntax
			var req = match[0],
				isAbsolute = req.charAt(0) == '/';
			
			req = req.replace(/^\//, '') // leading slash not needed
				.replace(/\.\.?\//g, '.') // replace relative path indicators with dots
				.replace(/\//g, '.'); // any remaining slashes are path separators
			
			// isAbsolute handles the edge case where the path looks like /../foo
			imports[0] = {
				from: isAbsolute ? req : resolveRelativePath(req, path),
				as: req
			};
		} else {
			var msg = 'Invalid jsio request: jsio(\'' + request + '\')';
			throw SyntaxError ? new SyntaxError(msg) : new Error(msg);
		}
		return imports;
	};
	
	function makeContext(pkgPath, filePath) {
		var ctx = {
				exports: {},
				global: ENV.global
			},
			cwd = ENV.getCwd(),
			i = filePath.lastIndexOf('/'),
			isRelative = i > 0;
		
		ctx.require = ctx.jsio = bind(this, importer, ctx, pkgPath);
		ctx.module = {id: pkgPath};
		
		if (pkgPath != 'base') {
			ctx.jsio('from base import *');
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
	
	function importer(context, path, request, altContext) {
		// importer is bound to a module's (or global) context -- we can override this
		// by using altContext as in jsio('import foo', obj) --> obj.foo
		context = altContext || context || ENV.global;
		
		// parse the import request(s)
		var imports = resolveImportRequest(path, request),
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
					var module = sourceCache[pkg] || loadModule(pkg);
				} catch(e) {
					ENV.log('\nError executing \'', request, '\': could not load module', pkg, '\n\tpath:', path, '\n\trequest:', request, '\n');
					throw e;
				}
				
				if(!item.external) {
					var newContext = makeContext(pkg, module.filePath);
					modules[pkg] = newContext.exports;
					execModule(newContext, module);
					modules[pkg] = newContext.exports;
				} else {
					var newContext = modules[pkg] = {};
					
					// capture the requested objects so they don't escape into the global scope
					for(var j in item['import']) { newContext[j] = undefined; }
					
					execModule(newContext, module);
					for(var j in item['import']) {
						if(newContext[j] === undefined) {
							newContext[j] = ENV.global[j];
						}
					}
				}
			}
			
			var module = modules[pkg];
			
			// return the module if we're only importing one module
			if (numImports == 1) { retVal = module; }
			
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
		
		return retVal;
	}
})();
