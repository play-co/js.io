;(function(){

    var preloaded_source = {
	// Insert pre-loaded modules here...
    };

    var pre_jsioImport = [
	// Insert pre-require dependancies here
    ];
	
	if(typeof exports == 'undefined') {
		var jsio = window.jsio = bind(this, _jsioImport, window, '');
	} else if (typeof GLOBAL != 'undefined') {
		var jsio = GLOBAL.jsio = bind(this, _jsioImport, GLOBAL, '');
	}
	
        jsio.script_src = 'jsio.js';
	var modulePathCache = {}
	function getModulePathPossibilities(pathString) {
		var segments = pathString.split('.')
		var modPath = segments.join('/');
		var out;
		if (segments[0] in modulePathCache) {
			out = [[modulePathCache[segments[0]] + '/' + modPath + '.js', null]];
		} else {
			out = [];
			for (var i = 0, path; path = jsio.path[i]; ++i) {
				out.push([path + '/' + modPath + '.js', path]);
			}
		}
		return out;
	}
	
	jsio.path = ['.'];
	jsio.__env = typeof node !== 'undefined' && typeof process !== 'undefined' && process.version ? 'node' : 'browser';
	switch(jsio.__env) {
		case 'node':
			var posix = require('posix');
			var RUNTIME = {
				cwd: process.cwd,
				argv: process.ARGV,
				argc: process.ARGC,
				write: process.stdio.writeError,
				writeAsync: process.stdio.write,
				readFile: function(filename) { return posix.cat(filename, 'utf8'); },
				eval: function(code, location) { return process.compile(code, location); }
			}
			break;
		case 'browser':
			var src = browser_findScript();
			var segments = src.split('/');
			var cwd = segments.slice(0,segments.length-2).join('/');
			if (cwd) { jsio.path.push(cwd); } else { cwd = '.'; };
			var RUNTIME = {
				cwd: function() { return cwd; },
				argv: null,
				argc: null,
				write: browser_getLog(),
				writeAsync: browser_getLog(),
				readFile: function() {},
				eval: function(src) { return eval(src); }
			}
			
			if(typeof eval('(function(){})') == 'undefined') {
				RUNTIME.eval = function(src) {
					try {
						eval('jsio.__f=' + src);
						return jsio.__f;
					} finally {
						delete jsio.__f;
					}
				}
			}
			
			modulePathCache.jsio = cwd;
			break;
	}
	
	function browser_findScript() {
		try {
			var scripts = document.getElementsByTagName('script');
			for (var i = 0, script; script = scripts[i]; ++i) {
			    if ((script.src == jsio.script_src) || 
				(script.src.slice(script.src.length-jsio.script_src.length) == jsio.script_src)) {
				return makeAbsoluteURL(script.src, window.location);
			    }
			}
		} catch(e) {}
	}
	
	function browser_getLog() {
		if (typeof console != 'undefined' && console.log) {
			return console.log;
		} else {
			return browser_oldLog;
		}
	}
	
	function browser_oldLog() {
		var d = document.createElement('div');
		document.body.appendChild(d);
		out = []
		for (var i = 0, item; (item = arguments[i]) || i < arguments.length; ++i) {
			try {
				out.push(JSON.stringify(item));
			} catch(e) {
				out.push(item.toString());
			}
		}
		d.innerHTML = out.join(", ");
	}
	
	function $each(i, context, f) {
		if(!f) { f = context; context = this; }
		for(var j in i) {
			if(i.hasOwnProperty(j)) {
				f(j, i[j], i);
			}
		}
	}
	
	function bind(context, method/*, args... */) {
		var args = Array.prototype.slice.call(arguments, 2);
		return function(){
			method = (typeof method == 'string' ? context[method] : method);
			return method.apply(context, args.concat(Array.prototype.slice.call(arguments, 0)))
		}
	};
	
	function $setTimeout(f, t/*, args... */) {
		var args = Array.prototype.slice.call(arguments, 2);
		return setTimeout(function() {
			try {
				f.apply(this, args);
			} catch(e) {
				// log?
			}
		}, t)
	}
	
	function $setInterval(f, t/*, args... */) {
		var args = Array.prototype.slice.call(arguments, 2);
		return setInterval(function() {
			try {
				f.apply(this, args);
			} catch(e) {
				// log?
			}
		}, t)
	}
	
	function Class(parent, proto) {
		if(!parent) { throw new Error('parent or prototype not provided'); }
		if(!proto) { proto = parent; }
		else if(parent instanceof Array) { // multiple inheritance, use at your own risk =)
			proto.prototype = {};
			for(var i = 0, p; p = parent[i]; ++i) {
				for(var item in p.prototype) {
					if(!(item in proto.prototype)) {
						proto.prototype[item] = p.prototype[item];
					}
				}
			}
			parent = parent[0]; 
		} else { 
			proto.prototype = parent.prototype;
		}

		var cls = function() { if(this.init) { this.init.apply(this, arguments); }}
		cls.prototype = new proto(function(context, method, args) {
			var args = args || [];
			var target = parent;
			while(target = target.prototype) {
				if(target[method]) {
					return target[method].apply(context, args);
				}
			}
			throw new Error('method ' + method + ' does not exist');
		});
		cls.prototype.constructor = cls;
		return cls;
	}
	
	var strDuplicate = function(str, num) {
	    var out = "";
	    for (var i = 0; i < num; ++ i) {
		out += str;
	    }
	    return out;


	    // Doesn't work in node correctly.
	    //		return new Array(num + 1).join(str);
	}
	
	switch(jsio.__env) {
		case 'node':
			var nodeWrapper = {
//				include: include,
				require: require
			};
			
			var stringifyPretty = function(item) { return _stringify(true, item, 1); }
			var stringify = function(item) { return _stringify(false, item); }
			var _stringify = function(pretty, item, tab) {
				if(item instanceof Array) {
					var str = [];
					for(var i = 0, len = item.length; i < len; ++i) {
						str.push(_stringify(pretty, item[i]));
					}
					return '[' + str.join(',') + ']';
				} else if (typeof(item) == 'object') {
					var str = [];
					for(var key in item) {
						var value = key+':' + (pretty?' ':'');
						if(typeof item[key] == 'function') {
							var def = item[key].toString();
							var match = def.match(/^function\s+\((.*?)\)/);
							value += match ? 'f(' + match[1] + ') {...}' : '[Function]';
						} else {
							value += _stringify(pretty, item[key], tab + 1);
						}
						str.push(value);
					}
					
					if(pretty && str.length > 1) {
						var spacer = strDuplicate('\t', tab);
						return '{\n' + spacer + str.join(',\n' + spacer) + '\n' + strDuplicate('\t', tab - 1) + '}';
					} else {
						return '{' + str.join(',') + '}';
					}
				}
				return item + "";
			}
			
			var log = function() { 
				RUNTIME.write(Array.prototype.slice.call(arguments, 0).map(stringifyPretty).join(' ') + "\n");
			}
			
			window = GLOBAL;
			var compile = function(context, args) {
				try {
					var fn = RUNTIME.eval("(function(_) { with(_){delete _;(function(){" + args.src + "\n}).call(this)}})", args.location);
				} catch(e) {
					if(e instanceof SyntaxError) {
						log("Syntax Error loading ", args.location, e);
					}
					throw e;
				}
				
				try {
					fn.call(context.exports, context);
				} catch(e) {
					if(e.type == "stack_overflow") {
						log("Stack overflow in", args.location, e);
					} else {
						log("error when loading", args.location);
					}
					throw e;
				}
				return true;
			}

			var windowCompile = function(context, args) {
				var fn = RUNTIME.eval("(function(_){with(_){delete _;(function(){" + args.src + "\n}).call(this)}})", args.location);
				fn.call(context.exports, context);
			}
			
			var cwd = RUNTIME.cwd();
			var makeRelative = function(path) {
				var i = path.match('^' + cwd);
				if (i && i[0] == cwd) {
					var offset = path[cwd.length] == '/' ? 1 : 0
					return path.slice(cwd.length + offset);
				}
				return path;
			}

			var getModuleSourceAndPath = function(pathString) {
				var baseMod = pathString.split('.')[0];
				var paths = getModulePathPossibilities(pathString);
				var cwd = RUNTIME.cwd() + '/';
				for (var i = 0, path; path = paths[i]; ++i) {
					var cachePath = path[1];
					var path = path[0];
					try {
						var out = {src: RUNTIME.readFile(path).wait(), location: path};
						if (!(baseMod in modulePathCache)) {
							modulePathCache[baseMod] = cachePath;
						}
						return out;
					} catch(e) {}
				}
				throw new Error("Module not found: " + pathString + "\n(looked in " + paths + ")");
			}
			
			var segments = __filename.split('/');
			
			var jsioPath = segments.slice(0,segments.length-2).join('/');
			if (jsioPath) {
				jsio.path.push(jsioPath);
				modulePathCache.jsio = jsioPath;
			} else {
				modulePathCache.jsio = '.';
			}
			
			jsio.__path = makeRelative(RUNTIME.argv[1]);
			break;
		default:
			var log = browser_getLog();
			
			var compile = function(context, args) {
				var code = "(function(_){with(_){delete _;(function(){"
					+ args.src
					+ "\n}).call(this)}})\n//@ sourceURL=" + args.location;
				
				try { var fn = RUNTIME.eval(code); } catch(e) {
					if(e instanceof SyntaxError) {
						var src = 'javascript:document.open();document.write("<scr"+"ipt src=\'' 
							+ args.location
							+ '\'></scr"+"ipt>")';
						
						var callback = function() {
							var el = document.createElement('iframe');
							with(el.style) { position = 'absolute'; top = left = '-999px'; width = height = '1px'; visibility = 'hidden'; }
							el.src = src;
							$setTimeout(function() {
								document.body.appendChild(el);
							}, 0);
						}
						
						if(document.body) { callback(); }
						else { window.addEventListener('load', callback, false); }
						throw new Error("forcing halt on load of " + args.location);
					}
					throw e;
				}
				try {
					fn.call(context.exports, context);
				} catch(e) {
					log('error when loading ' + args.location);
					throw e;
				}
				return true;
			}

			var windowCompile = function(context, args) {
				var f = "(function(_){with(_){delete _;(function(){" + args.src + "\n}).call(this)}})\n//@ sourceURL=" + args.location;
				var fn = RUNTIME.eval(f);
				fn.call(context.exports, context);
			}
			
			var createXHR = function() {
				return window.XMLHttpRequest ? new XMLHttpRequest() 
					: window.ActiveXObject ? new ActiveXObject("Msxml2.XMLHTTP")
					: null;
			}
			
			var getModuleSourceAndPath = function(pathString) {
				if (preloaded_source[pathString]) {
				    return preloaded_source[pathString];
				}
				var baseMod = pathString.split('.')[0];
				var paths = getModulePathPossibilities(pathString);
				for (var i = 0, path; path = paths[i]; ++i) {
					var cachePath = path[1];
					var path = path[0];
					var xhr = createXHR();
					var failed = false;
					try {
						xhr.open('GET', path, false);
						xhr.send(null);
					} catch(e) {
						failed = true;
					}
					if (failed || // firefox file://
						xhr.status == 404 || // all browsers, http://
						xhr.status == -1100 || // safari file://
						// XXX: We have no way to tell in opera if a file exists and is empty, or is 404
						// XXX: Use flash?
						//(!failed && xhr.status == 0 && !xhr.responseText && EXISTS)) // opera
						false)
					{
						continue;
					}
					if (!(baseMod in modulePathCache)) {
						modulePathCache[baseMod] = cachePath;
					}
					return {src: xhr.responseText, location: path};
				}
				throw new Error("Module not found: " + pathString + " (looked in " + paths.join(', ') + ")");
			}
			
			var makeRelative = function(path) {
				return path.replace(cwd + '/', '').replace(cwd, '');
			}
			
			jsio.__path = makeRelative(window.location.toString());
			
			break;
	}
	jsio.basePath = jsio.path[jsio.path.length-1];
	var modules = {bind: bind, Class: Class, log: log, jsio:jsio};
	
	function makeAbsoluteURL(url, location) {
		if (/^[A-Za-z]*:\/\//.test(url)) { return url; } // already absolute
		var prefix = location.protocol + '//' + location.host;
		if (url.charAt(0) == '/') { return prefix + url; }
		var result = location.pathname.match(/\/*(.*?\/?)\/*$/);
		var parts = result ? result[1].split('/') : [];
		parts.pop();
		
		var urlParts = url.split('/');
		while(true) {
			if(urlParts[0] == '.') {
				urlParts.shift();
			} else if(urlParts[0] == '..') {
				urlParts.shift(); parts.pop();
			} else {
				break;
			}
		}
		
		var pathname = parts.join('/');
		if(pathname) pathname += '/';
		return prefix + '/' + pathname + urlParts.join('/');
	}
	
	function resolveRelativePath(pkg, path) {
		if(pkg.charAt(0) == '.') {
			pkg = pkg.substring(1);
			var segments = path.split('.');
			while(pkg.charAt(0) == '.') {
				pkg = pkg.slice(1);
				segments.pop();
			}
			
			var prefix = segments.join('.');
			if (prefix) {
				return prefix + '.' + pkg;
			}
		}
		return pkg;
	}
	
	function _jsioImport(context, path, what) {
		// parse the what statement
		var match, imports = [];
		if((match = what.match(/^(from|external)\s+([\w.$]+)\s+import\s+(.*)$/))) {

			imports[0] = {from: resolveRelativePath(match[2], path), external: match[1] == 'external', "import": {}};
			match[3].replace(/\s*([\w.$*]+)(?:\s+as\s+([\w.$]+))?/g, function(_, item, as) {
				imports[0]["import"][item] = as || item;
			});
		} else if((match = what.match(/^import\s+(.*)$/))) {
			match[1].replace(/\s*([\w.$]+)(?:\s+as\s+([\w.$]+))?,?/g, function(_, pkg, as) {
				fullPkg = resolveRelativePath(pkg, path);
				imports[imports.length] = as ? {from: fullPkg, as: as} : {from: fullPkg, as: pkg};
			});
		} else {
			if(SyntaxError) {
				throw new SyntaxError(what);
			} else {
				throw new Error("Syntax error: " + what);
			}
		}
		
		// import each item in the what statement
		for(var i = 0, item, len = imports.length; (item = imports[i]) || i < len; ++i) {
			var pkg = item.from;
			
			// eval any packages that we don't know about already
			var segments = pkg.split('.');
			if(!(pkg in modules)) {
				try {
					var result = getModuleSourceAndPath(pkg);
				} catch(e) {
					log('Error:', context.jsio.__path, 'could not execute: "' + what + '"');
					throw e;
				}
				var newRelativePath = segments.slice(0, segments.length - 1).join('.');
				if(!item.external) {
					var newContext = {
						exports: {},
						global: window,
						bind: bind,
						Class: Class,
						$setTimeout: $setTimeout,
						$setInterval: $setInterval
					};
					newContext.jsio = bind(this, _jsioImport, newContext, newRelativePath);
					for(var j in modules.jsio) {
					    newContext.jsio[j] = modules.jsio[j];
					}
					
					// TODO: FIX for "trailing ." case
					var tmp = result.location.split('/');
					newContext.jsio.__dir = makeRelative(tmp.slice(0,tmp.length-1).join('/'));
					newContext.jsio.__path = makeRelative(result.location);
					newContext.jsio.__env = jsio.__env;
					newContext.jsio.node = nodeWrapper;
					compile(newContext, result);
					modules[pkg] = newContext.exports;
				} else {
					var newContext = {};
					for(var j in item["import"]) {
						newContext[j] = undefined;
					}
					windowCompile(newContext, result);
					modules[pkg] = newContext;
					for(var j in item["import"]) {
						if(newContext[j] === undefined) {
							newContext[j] = window[j];
						}
					}
				}
			}
			
			if(item.as) {
				// remove trailing/leading dots
				var segments = item.as.match(/^\.*(.*?)\.*$/)[1].split('.');
				var c = context;
				for(var k = 0, slen = segments.length - 1, segment; (segment = segments[k]) && k < slen; ++k) {
					if(!segment) continue;
					if (!c[segment]) { c[segment] = {}; }
					c = c[segment];
				}
				c[segments[slen]] = modules[pkg];
			} else if(item["import"]) {
				if(item["import"]['*']) {
					for(var k in modules[pkg]) { context[k] = modules[pkg][k]; }
				} else {
					try {
						for(var k in item["import"]) { context[item["import"][k]] = modules[pkg][k]; }
					} catch(e) {
						log('module: ', modules);
						throw e;
					}
				}
			}
		}
		
	}
	
	// create the internal require function bound to a local context
	var _localContext = {};
	var _jsio = _localContext.jsio = bind(this, _jsioImport, _localContext, 'jsio');

	_jsio('import jsio.env');
	_jsio('import jsio.std.JSON');
	_jsio.std.JSON.createGlobal(); // create the global JSON object if it doesn't already exist
	
	jsio.listen = function(server, transportName, opts) {
		var listenerClass = _jsio.env.getListener(transportName);
		var listener = new listenerClass(server, opts);
		listener.listen();
		return listener;
	}
	
	jsio.connect = function(protocolInstance, transportName, opts) {
		var connector = new (_jsio.env.getConnector(transportName))(protocolInstance, opts);
		connector.connect();
		return connector;
	}
	
	jsio.quickServer = function(protocolClass) {
		_jsio('import .interfaces');
		return new _jsio.interfaces.Server(protocolClass);
	}
	
    for (var i = 0, target; target = pre_jsioImport[i]; ++i) {
        jsio.require(target);
    }
})();
