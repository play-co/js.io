jsio('import std.js as JS');

// compiler should be able to compile itself, so use a different name for calls to jsio that we don't want to try to compile
var JSIO = jsio.__jsio; 

var sourceCache = /jsio.__srcCache\s*=\s*\{\s*\}/,
	jsioAddPath = /jsio\.addPath\s*\(\s*(['"][^'"]+?['"])\s*\)/g,
	jsioNormal = /jsio\s*\(\s*(['"].+?['"])\s*(,\s*\{[^}]+\})?\)/g,
	jsioDynamic = /jsio\s*\(\s*DYNAMIC_IMPORT_(.*?)\s*(,\s*\{[^}]+\})?\)/g,
	srcTable = {};

exports = function(path, moduleDef, opts) {
	opts = opts || {};
	
	logger.info('compiling', moduleDef.path);
	
	// prevent double import
	if (srcTable[moduleDef.path]) {
		moduleDef.src = '';
		return;
	}
	srcTable[moduleDef.path] = true;
	
	var self = moduleDef.path;
	
	if (opts.path) {
		if (JS.isArray(opts.path)) {
			for (var i = 0, len = opts.path.length; i < len; ++i) {
				JSIO.addPath(opts.path);
			}
		} else if (typeof opts.path == 'string') {
			JSIO.addPath(opts.path);
		}
	}
	
	if (opts.autoDetectPaths) {
		jsioAddPath.lastIndex = 0;
		logger.debug('detecting paths for', self);
		while (true) {
			var match = jsioAddPath.exec(moduleDef.src);
			if (!match) { break; }
			logger.debug('found path ' + match[1]);
			try {
				JSIO.addPath(eval(match[1]));
			} catch(e) {
				logger.warn('failed to add path ' + match[1]);
			}
		}
	}
	
	jsioNormal.lastIndex = 0;
	while (true) {
		var match = jsioNormal.exec(moduleDef.src);
		if (!match) { break; }
		
		logger.debug('detected', match[0])
		
		var cmd = match[1],
			inlineOpts = match[2] ? match[2].substring(1) : '';
		
		try {
			cmd = eval(cmd);
		} catch(e) {
			logger.warn('could not compile import from', self + ':', cmd);
			continue;
		}
		
		try {
			inlineOpts = eval(inlineOpts);
		} catch(e) {
			logger.warn('could not parse opts for jsio in', self + ':', inlineOpts);
			inlineOpts = {};
		}
		
		run(moduleDef, cmd, opts, inlineOpts);
	}
	
	jsioDynamic.lastIndex = 0;
	while(true) {
		var match = jsioDynamic.exec(moduleDef.src);
		if (!match) { break; }
		
		var cmd = match[1],
			inlineOpts = match[2] || '';
		
		if (opts.dynamicImports && cmd in opts.dynamicImports) {
			var dynamicImports = opts.dynamicImports[cmd];
			if (!dynamicImports) {
				logger.debug('Dynamic import ' + cmd + ': <nothing>');
				continue;
			} else if (JS.isArray(dynamicImports)) {
				for (var j = 0, line; line = dynamicImports[j]; ++j) {
					logger.debug('Dynamic import ' + cmd + ': ' + line);
					run(moduleDef, line, opts, inlineOpts);
				}
			} else {
				logger.debug('Dynamic import ' + cmd + ': ' + dynamicImports);
				run(moduleDef, dynamicImports, opts, inlineOpts);
			}
		} else {
			logger.error('Missing: import definition\nConstant', cmd, 'for DYNAMIC_IMPORT_' + cmd, ' was not provided to the compiler');
		}
	}
	
	srcTable[moduleDef.path] = JS.shallowCopy(moduleDef);
	moduleDef.src = '';
}

var compressor;
exports.setCompressor = function(_compressor) { compressor = _compressor; }

exports.generateSrc = function(opts, callback) {
	var opts = opts || {};

	var cb = bind(this, buildJsio, opts, callback);
	if (opts.compressSources) {
		compressTable(srcTable, opts, cb);
	} else {
		cb();
	}
}

exports.getPathJS = function() {
	var path = JS.shallowCopy(JSIO.__path);
	path.__default__ = [];
	return 'jsio.__path=' + JSON.stringify(path) + ';';
}

function buildJsio(opts, callback) {
	var src,
		jsioSrc = (opts.dontIncludeJsio ? ''
			: ';(' + jsio.__jsio.__init__.toString(-1) + ')();')
				+ exports.getPathJS();
	
	if (opts.dontModifyJsio || opts.dontIncludeJsio) {
		var lines = [];
		for (var i in srcTable) {
			lines.push("jsio.setCachedSrc('" + srcTable[i].path + "'," + JSON.stringify(srcTable[i].src) + ");");
		}
		src = jsioSrc + lines.join('\n');
	} else {
		// use a function to avoid having to do some crazy escaping of '$' in the replacement string!
		src = jsioSrc.replace(sourceCache, function(match) { return "jsio.__srcCache=" +  JSON.stringify(srcTable); });
	}
	
	if (opts.compressJsio || opts.compressSources) {
		logger.info('compressing final code...');
		compressor(src, callback);
	} else {
		callback(src);
	}
}

function compressTable(table, opts, callback) {
	logger.info('compressing sources');
	
	var queue = [];
	for (var i in table) { queue.push(i); }
	
	compressStep(queue, table, queue.pop(), callback);
}

function compressStep(queue, table, key, callback) {
	if (key) {
		logger.log('compressing', key + '...');
		compressor(table[key].src, function(result) {
			table[key].src = result;
			compressStep(queue, table, queue.pop(), callback);
		});
	} else {
		callback();
	}
}

exports.getTable = function() { return srcTable; }

exports.compile = function(statement, opts) {
	var newOpts = mergeOpts({reload: true}, opts);
	JSIO.__jsio(statement, newOpts);
}

function run(moduleDef, cmd, opts, inlineOpts) {
	var newOpts = mergeOpts(opts, inlineOpts);
	JSIO.__importer({}, moduleDef.directory, moduleDef.filename, cmd, newOpts);
}

function mergeOpts(opts, inlineOpts) {
	var newOpts = JS.merge(JS.shallowCopy(opts), inlineOpts);
	
	// add compiler to the end of the preprocessors list
	if (newOpts.preprocessors) {
		for (var i = 0, len = newOpts.preprocessors.length; i < len; ++i) {
			if (newOpts.preprocessors[i] == 'compiler') {
				break;
			}
		}
		if (i == len) {
			newOpts.preprocessors.push('compiler');
		}
	} else {
		newOpts.preprocessors = ['compiler'];
	}
	return newOpts;
}

