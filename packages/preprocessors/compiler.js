var path = require("jsio/util/path");

// compiler should be able to compile itself, so use a different name for calls to jsio that we don't want to try to compile
var JSIO = jsio.__jsio;

var gSrcTable = {};
var gDynamicList = {};
var gCompilerOpts = {};

function testComment(match) {
	return !/\/\//.test(match[1]);
}

exports = function(path, moduleDef, opts) {
	opts = opts || {};

	if (gSrcTable[moduleDef.path]) {
		moduleDef.src = '';
		return;
	}

	logger.info('compiling', moduleDef.path);
	checkDynamicImports(moduleDef);

	// prevent double import
	gSrcTable[moduleDef.path] = true;

	var self = moduleDef.path;

	if (gCompilerOpts.autoDetectPaths) {
		logger.debug('detecting paths for', self);

		var jsioAddPath = /^(.*)jsio\.path\.add\s*\(\s*(['"][^'"]+?['"])\s*\)/gm;
		while (true) {
			var match = jsioAddPath.exec(moduleDef.src);
			if (!match || !testComment(match)) { break; }
			try {
				var path = match[2];
				jsio.path.add(eval(path));
				logger.info('added path', path);
			} catch(e) {
				logger.info('failed to add path', path);
			}
		}
	}

	var jsioNormal = /^(.*)jsio\s*\(\s*(['"].+?['"])\s*(,\s*\{[^}]+\})?\)/gm;
	while (true) {
		var match = jsioNormal.exec(moduleDef.src);
		if (!match) { break; }
		if (!testComment(match)) { continue; }

		logger.debug(moduleDef.path, 'detected', match[0])

		var cmd = match[2],
			inlineOpts = match[3] ? match[3].substring(1) : '';

		try {
			cmd = eval(cmd);
		} catch(e) {
			logger.warn('could not compile import from', self + ':', cmd);
			continue;
		}

		if (inlineOpts) {
			try {
				inlineOpts = eval("(" + inlineOpts + ")") || {};
			} catch(e) {
				logger.warn('could not parse opts for jsio in', self + ':', inlineOpts);
			}
		}

		if (!inlineOpts) {
			inlineOpts = {};
		}

		if (gCompilerOpts.preprocessors) {
			if (!inlineOpts.preprocessors) {
				inlineOpts.preprocessors = gCompilerOpts.preprocessors.slice(0);
			} else {
				gCompilerOpts.preprocessors.forEach(function (preprocessor) {
					if (inlineOpts.preprocessors.indexOf(preprocessor) == -1) {
						inlineOpts.preprocessors.push(preprocessor);
					}
				});
			}
		}

		try {
			run(moduleDef, cmd, inlineOpts);
		} catch (e) {
			logger.warn('could not compile import from', self + ':', cmd);
		}
	}

	var jsioDynamic = /^(.*)jsio\s*\(\s*DYNAMIC_IMPORT_(.*?)\s*(,\s*\{[^}]+\})?\)/gm;
	while(true) {
		var match = jsioDynamic.exec(moduleDef.src);
		if (!match || !testComment(match)) { break; }

		var cmd = match[2];
		var inlineOpts;
		try {
			inlineOpts = eval(match[3] || '') || {};
		} catch(e) {
			inlineOpts = {};
		}

		if (gCompilerOpts.dynamicImports && cmd in gCompilerOpts.dynamicImports) {
			var dynamicImports = gCompilerOpts.dynamicImports[cmd];
			if (!dynamicImports) {
				logger.debug('Dynamic import ' + cmd + ': <nothing>');
				continue;
			} else if (isArray(dynamicImports)) {
				for (var j = 0, line; line = dynamicImports[j]; ++j) {
					logger.debug('Dynamic import ' + cmd + ': ' + line);
					run(moduleDef, line, inlineOpts);
				}
			} else {
				logger.debug('Dynamic import ' + cmd + ': ' + dynamicImports);
				run(moduleDef, dynamicImports, inlineOpts);
			}
		} else {
			logger.error('Missing: import definition\nConstant', cmd, 'for DYNAMIC_IMPORT_' + cmd, ' was not provided to the compiler for ', path, 'from', moduleDef.path);
		}
	}

	// store a copy of the module def (with the source code)
	gSrcTable[moduleDef.path] = merge({}, moduleDef);

	// make sure to delete exports if we've executed this module for some reason (e.g. dynamic import files, base.js)
	// since we can't JSON.stringify exports (circular reference exports.module.exports)
	delete gSrcTable[moduleDef.path].exports;

	// don't actually execute the source!
	moduleDef.src = '';
}

exports.reset = function() {
	gSrcTable = {};
}

/**
 * opts.compressSources: compress each source file ** requires an active compressor (see exports.setCompressor)
 * opts.compressResult: compress the resulting file ** requires an active compressor (see exports.setCompressor)
 * opts.includeJsio: include a copy of jsio.js in the output
 */
exports.generateSrc = function(opts, callback) {
	var opts = merge(opts, {
			compressSources: false,
			includeJsio: true
		});

	if (opts.preCompress) {
		opts.preCompress(gSrcTable);
	}

	var cb = bind(this, buildJsio, opts, callback);
	if (opts.compressSources) {
		compressTable(gSrcTable, opts, cb);
	} else {
		cb();
	}
}

exports.getPathJS = function() {
	var cwd = jsio.__env.getCwd();

	var cache = {};
	Object.keys(jsio.path.cache).forEach(function (key) {
		cache[key] = replaceSlashes(path.relative(cwd, jsio.path.cache[key])) || './';
	});

	return 'jsio.path.set('
		+ JSON.stringify(jsio.path.get().map(function (value) {
			return replaceSlashes(path.relative(cwd, value));
		})) + ');jsio.path.cache=' + JSON.stringify(cache) + ';';

}

function replaceSlashes(str) {
	return str.replace(/\\+/g, '/').replace(/\/{2,}/g, '/');
}

function buildJsio(opts, callback) {
	function getJsioSrc() {
		var src = jsio.__jsio.__init__.toString(-1);
		if (src.substring(0, 8) == 'function') {
			src = 'jsio=(' + src + ')();';
		}
		return src;
	}

	var src;
	var jsioSrc = (opts.includeJsio ? getJsioSrc() : '')
				+ exports.getPathJS();

	var cwd = jsio.__env.getCwd();
	var table = {};
	for (var entry in gSrcTable) {
		var relPath = replaceSlashes(path.relative(cwd, entry));
		table[relPath] = gSrcTable[entry];
		table[relPath].path = relPath;
		table[relPath].directory = replaceSlashes(path.relative(cwd, gSrcTable[entry].directory));
	}

	// if we're not allowed to modify the jsio source or we're not including the jsio source
	// then use jsio.setCachedSrc to include the source strings
	if (!opts.includeJsio) {
		logger.info('source include method: jsio.setCachedSrc');

		var lines = [];
		for (var i in table) {
			lines.push("jsio.setCachedSrc('" + table[i].path + "'," + JSON.stringify(table[i].src) + ");");
		}
		src = jsioSrc + lines.join('\n');
	} else {
		logger.info('source include method: jsio.setCache');

		src = jsioSrc + "jsio.setCache(" + JSON.stringify(table) + ");";
	}

	if (opts.compressResult && gCompilerOpts.compressor) {
		logger.info('compressing final code...');
		gCompilerOpts.compressor(null, src, opts, callback);
	} else {
		callback(src);
	}
}

function compressTable(table, opts, callback) {
	logger.info('compressing sources');

	var queue = [];
	for (var i in table) { queue.push(i); }

	compressStep(queue, table, opts, queue.pop(), callback);
}

function compressStep(queue, table, opts, key, callback) {
	if (key && gCompilerOpts.compressor) {
		logger.log('compressing', key + '...');
		gCompilerOpts.compressor(key, table[key].src, opts, function(result) {
			table[key].src = result;
			compressStep(queue, table, opts, queue.pop(), callback);
		});
	} else {
		callback();
	}
}

exports.getTable = function() { return gSrcTable; }

// opts.compressor must have the signature function (string source, function callback)
exports.setCompilerOpts = function(opts) {
	gCompilerOpts = opts;

	if ('debugLevel' in opts) {
		logger.setLevel(opts.debugLevel);
	}

	if (opts.path) {
		if (isArray(opts.path)) {
			for (var i = 0, len = opts.path.length; i < len; ++i) {
				jsio.path.add(opts.path[i]);
			}
		} else if (typeof opts.path == 'string') {
			jsio.path.add(opts.path);
		}
	}
}

exports.compile = function(statement, opts) {
	JSIO(statement, updateOpts(opts));
}

function run(moduleDef, cmd, opts) {
	JSIO.__require({}, moduleDef.directory, moduleDef.filename, cmd, updateOpts(opts));
}

function updateOpts(opts) {
	opts = opts || {};

	if (!opts.preprocessors) {
		opts.preprocessors = ['compiler'];
	} else if (opts.preprocessors.indexOf('compiler') == -1) {
		opts.preprocessors.push('compiler');
	}

	opts.reload = true;
	opts.initialImport = true;
	return opts;
}

function checkDynamicImports(moduleDef) {
	var directory = moduleDef.directory;

	// have we checked this directory for dynamic imports?
	if (!gDynamicList[directory]) {
		gDynamicList[directory] = true;

		logger.info("Checking directory", directory, "for dynamic imports... (" + gCompilerOpts.environment + ")");

		// try to do a commonJS-style import
		var filename = path.join(directory, '__imports__');
		var module = JSIO.__require(null, directory, 'compiler', './__imports__', {dontExport: true, suppressErrors: true});
		if (module && module.resolve) {
			try {
				var imports = module.resolve(gCompilerOpts.environment, gCompilerOpts);
			} catch (e) {
				logger.error("Error running module.resolve for", filename, "\n\n", e, "\n\n");
				throw e;
			}

			if (imports && imports.forEach) {
				imports.forEach(function(imp) {
					logger.log("dynamic import:", imp);

					var opts = {};
					if (gCompilerOpts.preprocessors) {
						opts.preprocessors = gCompilerOpts.preprocessors.slice(0);
					}

					try {
						run(moduleDef, "import " + imp, opts);
					} catch (e) {
						logger.error("module", imp, "failed to compile (requested from", filename, ")\n\n");
						throw e;
					}
				});
			}
		} else {
			logger.info("None found.");
		}
	}
}
