jsio('import std.js as JS');

// compiler should be able to compile itself, so use a different name for calls to jsio that we don't want to try to compile
var JSIO = jsio.__jsio; 

var sourceCache = /jsio.__srcCache\s*=\s*\{\s*\}/,
	jsioAddPath = /jsio\.path\.add\s*\(\s*(['"][^'"]+?['"])\s*\)/g,
	jsioNormal = /jsio\s*\(\s*(['"].+?['"])\s*(,\s*\{[^}]+\})?\)/g,
	jsioDynamic = /jsio\s*\(\s*DYNAMIC_IMPORT_(.*?)\s*(,\s*\{[^}]+\})?\)/g,
	gSrcTable = {};

exports = function(path, moduleDef, opts) {
	opts = opts || {};
	
	if (gSrcTable[moduleDef.path]) {
		moduleDef.src = '';
		return;
	}
	
	logger.info('compiling', moduleDef.path);
	
	// prevent double import
	gSrcTable[moduleDef.path] = true;
	
	var self = moduleDef.path;
	
	if (opts.path) {
		if (JS.isArray(opts.path)) {
			for (var i = 0, len = opts.path.length; i < len; ++i) {
				jsio.path.add(opts.path);
			}
		} else if (typeof opts.path == 'string') {
			jsio.path.add(opts.path);
		}
	}
	
	if (opts.autoDetectPaths) {
		jsioAddPath.lastIndex = 0;
		logger.debug('detecting paths for', self);
		while (true) {
			var match = jsioAddPath.exec(moduleDef.src);
			if (!match) { break; }
			try {
				jsio.path.add(eval(match[1]));
				logger.info('added path ' + match[1]);
			} catch(e) {
				logger.info('failed to add path ' + match[1]);
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
	
	gSrcTable[moduleDef.path] = JS.shallowCopy(moduleDef);
	moduleDef.src = '';
}

exports.reset = function() {
	gSrcTable = {};
}

/**
 * set the compressor function, which has the signature:
 *    function (string source, function callback)
 */
var gActiveCompressor;
exports.setCompressor = function(compressor) { gActiveCompressor = compressor; }

/**
 * opts.compressSources: compress each source file ** requires an active compressor (see exports.setCompressor)
 * opts.compressResult: compress the resulting file ** requires an active compressor (see exports.setCompressor)
 * opts.includeJsio: include a copy of jsio.js in the output
 * opts.preserveJsioSource: don't modify the included copy of jsio.js (useful if the code will be used in another run of the jsio compiler)
 */
exports.generateSrc = function(opts, callback) {
	
	var opts = JS.merge(opts, {
			compressSources: false,
			includeJsio: true,
			preserveJsioSource: false
		});

	var cb = bind(this, buildJsio, opts, callback);
	if (opts.compressSources) {
		compressTable(gSrcTable, opts, cb);
	} else {
		cb();
	}
}

exports.getPathJS = function() {
	return 'jsio.path.set(' + JSON.stringify(jsio.path.get()) + ');jsio.path.cache=' + JSON.stringify(jsio.path.cache) + ';';
}

function buildJsio(opts, callback) {
	var src,
		jsioSrc = (opts.includeJsio ? ';(' + jsio.__jsio.__init__.toString(-1) + ')();' : '')
				+ exports.getPathJS();
	
	// if we're not allowed to modify the jsio source or we're not including the jsio source
	// then use jsio.setCachedSrc to include the source strings
	if (opts.preserveJsioSource || !opts.includeJsio) {
		logger.info('source include method: jsio.setCachedSrc');
		
		var lines = [];
		for (var i in gSrcTable) {
			lines.push("jsio.setCachedSrc('" + gSrcTable[i].path + "'," + JSON.stringify(gSrcTable[i].src) + ");");
		}
		src = jsioSrc + lines.join('\n');
	} else {
		logger.info('source include method: setting jsio.__srcCache');
		
		// otherwise we can just look for the jsio.__srcCache variable and inline the compiled
		// source as a JSON string.  We need to use a function here to avoid some ugly escaping
		// of '$' in the replacement string.
		src = jsioSrc.replace(sourceCache, function(match) { return "jsio.__srcCache=" +  JSON.stringify(gSrcTable); });
	}
	
	if (opts.compressResult) {
		logger.info('compressing final code...');
		gActiveCompressor(src, callback);
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
		gActiveCompressor(table[key].src, function(result) {
			table[key].src = result;
			compressStep(queue, table, queue.pop(), callback);
		});
	} else {
		callback();
	}
}

exports.getTable = function() { return gSrcTable; }

exports.compile = function(statement, opts) {
	var newOpts = mergeOpts({reload: true}, opts);
	JSIO(statement, newOpts);
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

