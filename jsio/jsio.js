;(function(){
	if(typeof exports == 'undefined') {
		exports = {};
		window.jsio = exports;
	}
	
	exports.getEnvironment = function() {
		if (typeof(node) !== 'undefined' && node.version) {
			return 'node';
		}
		return 'browser';
	};

	exports.bind = function(context, method/*, arg1, arg2, ... */){
		var args = Array.prototype.slice.call(arguments, 2);
		return function(){
			method = (typeof method == 'string' ? context[method] : method);
			return method.apply(context, args.concat(Array.prototype.slice.call(arguments, 0)))
		}
	};
	
	var bind = exports.bind;
	
	exports.Class = function(parent, proto) {
		if(!parent) { throw new Error('parent or prototype not provided'); }
		if(!proto) { proto = parent; }
		else { proto.prototype = parent.prototype; }
		
		for(var f in proto) {
			if(typeof proto[f] == 'function') {
				proto[f].name = f;
			}
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
		cls.constructor = cls;
		return cls;
	}
    var modulePathCache = {}
	var getModulePathPossibilities = function(pathString) {
        var segments = pathString.split('.')
        var modPath = pathString.split('.').join('/');
        var isModule = modPath[modPath.length-1] == '/';
        var out;
        if (segments[0] in modulePathCache) {
            out = [[modulePathCache[segments[0]] + '/' + segments.join('/') + (isModule ? '__init__.js' : '.js'), null]]
        }
        else {
            out = [];
            for (var i = 0, path; path = exports.path[i]; ++i) {
                out.push([path + '/' + modPath + (isModule ? '__init__.js' : '.js'), path])
            }
        }
        return out;
	}
	
    exports.path = ['.']
	switch(exports.getEnvironment()) {
		case 'node':
			exports.log = function() {
				node.stdio.writeError([].slice.call(arguments, 0).join(' ') + "\n");
			}
			console = {log: exports.log};
			window = process;
			var compile = function(context, args) {
				var fn = node.compile("function(_){with(_){delete _;(function(){" + args.src + "\n})()}}", args.url);
				fn.call(context.exports, context);
			}
			
			var getModuleSourceAndPath = function(pathString) {
                var baseMod = pathString.split('.')[0];
				var urls = getModulePathPossibilities(pathString);
				var cwd = node.cwd() + '/';
				for (var i = 0, url; url = urls[i]; ++i) {
                    var cachePath = url[1];
                    var url = url[0];
					try {
						var out = {src: node.fs.cat(url, "utf8").wait(), url: url};
                        if (!(baseMod in modulePathCache)) {
                            modulePathCache[baseMod] = cachePath;
                        }
                        return out;
					} catch(e) {}
				}
				throw new Error("Module not found: " + pathString);
			}
            var segments = __filename.split('/');

            var jsioPath = segments.slice(0,segments.length-2).join('/');
            exports.path.push(jsioPath)
            modulePathCache.jsio = jsioPath;
			break;
		default:
			exports.log = function() {
				if (typeof console != 'undefined' && console.log) {
					console.log.apply(console, arguments);
				}
			}
			
			var compile = function(context, args) {
				var code = "var fn = function(_){with(_){delete _;(function(){" + args.src + "\n}).call(this)}}\n//@ sourceURL=" + args.url;
				eval(code);
				fn.call(context.exports, context);
			}
			
			var getModuleSourceAndPath = function(pathString) {
                var baseMod = pathString.split('.')[0];
				var urls = getModulePathPossibilities(pathString);
				for (var i = 0, url; url = urls[i]; ++i) {
                    var cachePath = url[1];
                    var url = url[0];
					var xhr = new XMLHttpRequest()
					var failed = false;
					try {
						var xhr = new XMLHttpRequest()
						xhr.open('GET', url, false);
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
					return {src: xhr.responseText, url: url};
				}
				throw new Error("Module not found: " + pathString);
			}
            try {
                var scripts = document.getElementsByTagName('script');
                for (var i = 0, script; script = scripts[i]; ++i) {
                    if (script.src.match('jsio/jsio.js$')) {
                        var segments = script.src.split('/')
                        var jsioPath = segments.slice(0,segments.length-2).join('/');
                        exports.path.push(jsioPath);
                        modulePathCache.jsio = jsioPath;
                        break;
                    }
                }
            } catch(e) {}
			break;
	}
	
	var modules = {jsio: exports};
	var _require = function(context, path, pkg, what) {
		var origPkg = pkg;
		if(pkg.charAt(0) == '.') {
			pkg = pkg.slice(1);
			// resolve relative paths
			var segments = path.split('.');
			while(pkg.charAt(0) == '.') {
				pkg = pkg.slice(1);
				segments.pop();
			}
			var prefix = segments.join('.');
			if (prefix) {
				pkg = segments.join('.') + '.' + pkg;
			}
		}

		var segments = pkg.split('.');
		if(!(pkg in modules)) {
			var result = getModuleSourceAndPath(pkg);
			var newRelativePath = segments.slice(0, segments.length - 1).join('.');
			var newContext = {
				exports: {},
                global: window
			};
			newContext.require = bind(this, _require, newContext, newRelativePath);
            newContext.require.__jsio = true;
            // TODO: FIX for "trailing ." case
            newContext.require.__dir = newRelativePath.split('.').join('/');
            newContext.require.__path = result.url;
			newContext.jsio = {require: newContext.require};
			compile(newContext, result);
			modules[pkg] = newContext.exports;
		}

		if(what == '*') {
			for(var i in modules[pkg]) {
				context[i] = modules[pkg][i];
			}
		} else if(!what) {
			var segments = origPkg.split('.');
            // Remove trailing dot
            while (segments[segments.length-1] == "") {
                segments.pop()
            }
			var c = context;
			var len = segments.length - 1;
			for(var i = 0, segment; (segment = segments[i]) && i < len; ++i) {
				if(!segment) continue;
				if (!c[segment]) {
					c[segment] = {};
                }
				c = c[segment]
			}
			c[segments[len]] = modules[pkg];
			
		} else if(typeof what == 'string') {
			context[what] = modules[pkg][what];
		} else if(what.constructor == Object) {
			for(var item in what) {
				context[what[item]] = modules[pkg][item];
			}
		} else {
			for(var i = 0, item; item = what[i]; ++i) {
				context[item] = modules[pkg][item];
			}
		}
	}
	
	// create the external require function bound to the current context
	exports.require = bind(this, _require, window, '');
	
	// create the internal require function bound to a local context
	var _localContext = {jsio: {}};
	var jsio = _localContext.jsio;
	var require = bind(this, _require, _localContext, '');
	
	require('jsio.env.');
	exports.listen = function(server, transportName, opts) {
		var listener = new (jsio.env.getListener(transportName))(server, opts);
		listener.listen();
		return listener;
	}
	
	exports.connect = function(protocolInstance, transportName, opts) {
		var connector = new (jsio.env.getConnector(transportName))(protocolInstance, opts);
		connector.connect();
		return connector;
	}
    exports.quickServer = function(protocolClass) {
        require('jsio.interfaces');
        return new jsio.interfaces.Server(protocolClass);
    }

})();
