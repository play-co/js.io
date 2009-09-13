jsio = {}
jsio.getEnvironment = function() {
	if (typeof(node) !== 'undefined' && node.version) {
		return 'node';
	}
	return 'browser';
}

var getModuleSourceAndPath;

;(function(){
	switch(jsio.getEnvironment()) {
		case 'node':
			jsio.log = function() {
				node.stdio.writeError([].slice.call(arguments, 0).join(' ') + "\n");
			}
			console = jsio;
			console.log('case node');	
			window = process;
			
			jsio.compile = function(_, args) {
				var fn = node.compile("function(_){with(_){delete _;" + args.src + "\n} }", args.url);
				fn(_);
			}
			
			getModuleSourceAndPath = function (pathString) {
				var urls = getModulePathPossibilities(pathString);
				var cwd = node.cwd() + '/';
			    for (var i = 0, url; url = urls[i]; ++i) {
					url = cwd + url;
					console.log(url);
					try {
						return {src: node.fs.cat(url, "utf8").wait(), url: url};						
					} catch(e) {}
				}
				throw new Error("Module not found: " + pathString);
			}
			break;
		default:
			console.log('hey');
			jsio.log = function() {
				if (typeof console != 'undefined' && console.log) {
					console.log.apply(console, arguments);
				}
			}
			
			jsio.compile = function($, args) {
				var _ = function() { delete $; delete args; delete _; };
				eval("with($){_();" + args.src + "\n}\n//@ sourceURL=" + args.url);
			}
			
			getModuleSourceAndPath = function (pathString) {
			    var urls = getModulePathPossibilities(pathString);
			    for (var i = 0, url; url = urls[i]; ++i) {
			        var xhr = new XMLHttpRequest()
			        var failed = false;
			        try {
			        var xhr = new XMLHttpRequest()
			            xhr.open('GET', url, false);
			            xhr.send(null);
			        } catch(e) {
			            console.log('failed');
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
			            console.log(url, 'failed?');
			            continue;
			        }
			        return {src: xhr.responseText, url: url};
			    }
			    throw new Error("Module not found: " + pathString);
			}
			break;
	}
})();

jsio.bind = function(context, method/*, arg1, arg2, ... */){
    var args = Array.prototype.slice.call(arguments, 2);
    return function(){
        method = (typeof method == 'string' ? context[method] : method);
        var invocationArgs = Array.prototype.slice.call(arguments, 0);
        return method.apply(context, args.concat(invocationArgs))
    }
}

jsio.Class = function(parent, proto) {
    if(!parent) { throw new Error('parent or prototype not provided'); }
    if(!proto) { proto = parent; } 
    else { proto.prototype = parent.prototype; }    
    var cls = function() {
        if(this.init) {
            this.init.apply(this, arguments);
        }
    }
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
};

modules = {jsio: jsio};
_require = function(context, path, pkg, what) {
	console.log('_require!', arguments);
	var origPkg = pkg;
	if(pkg.charAt(0) == '.') {
		pkg = pkg.slice(1);
		// resolve relative paths
		var segments = path.split('.');
		console.log('segments are (firstly):', segments);
		while(pkg.charAt(0) == '.') {
			pkg = pkg.slice(1);
			segments.pop();
		}
		console.log('pkg', pkg);
		console.log('segments', segments);
		var prefix = segments.join('.');
		if (prefix) {
			pkg = segments.join('.') + '.' + pkg;
		}
		console.log('pkg is now', pkg);
	}
	
	var segments = pkg.split('.');
	if(!(pkg in modules)) {
		var result = getModuleSourceAndPath(pkg);
		var newRelativePath = segments.slice(0, segments.length - (result.url.match('__init__.js$') ? 0 : 1)).join('.');
		console.log('newRelativePath is', newRelativePath);
		var newContext = {
			exports: {}
		};
		newContext['require'] = jsio.bind(this, '_require', newContext, newRelativePath);
		jsio.compile(newContext, result);
		modules[pkg] = newContext.exports;
	}
	
	if(what == '*') {
		for(var i in modules[pkg]) {
			context[i] = modules[pkg][i];
		}
	} else if(!what) {
		var segments = origPkg.split('.');
		var c = context;
		var len = segments.length - 1;
		
		for(var i = 0, segment; (segment = segments[i]) && i < len; ++i) {
			if(!segment) continue;
			if (!c[segment])
				c[segment] = {};
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

jsio.require = jsio.bind(this, _require, window, '');

jsio.require('jsio.env');
jsio.listen = function(server, transportName, opts) {
	var listener = new (jsio.env.getListener(transportName))(server, opts);
	listener.listen();
	return listener;
}

jsio.connect = function(protocolInstance, transportName, opts) {
	var connector = new (jsio.env.getConnector(transportName))(protocolInstance, opts);
	connector.connect();
	return connector;
}

function getModulePathPossibilities(pathString) {
    var output = []
    var path = pathString.split('.');
    output.push(path.join('/') + '/__init__.js');
    output.push(path.join('/') + '.js');
    return output;
}
