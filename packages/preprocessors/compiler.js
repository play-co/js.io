jsio('import std.js as JS');

// compiler should be able to compile itself, so use a different name for calls to jsio that we don't want to try to compile
var JSIO = jsio.__jsio; 

var sourceCache = /sourceCache\s*=\s*\{\s*(\/\/ Insert pre-loaded modules here...)?\s*\}/,
	jsioAddPath = /jsio\.addPath\s*\(\s*(['"][^'"]+?['"])\s*\)/g,
	jsioNormal = /jsio\s*\(\s*['"](.+?)['"]\s*(,\s*\{[^}]+\})?\)/g,
	jsioDynamic = /jsio\s*\(\s*DYNAMIC_IMPORT_(.*?)\s*(,\s*\{[^}]+\})?\)/g,
	srcTable = {};

exports = function(path, moduleDef, opts) {
	opts = opts || {};
	
	// prevent double import
	if (srcTable[moduleDef.filePath]) {
		moduleDef.src = '';
		return;
	}
	srcTable[moduleDef.filePath] = true;
	
	var self = moduleDef.filePath;
	logger.info('> compiling', self, 'at path', path);
	
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
		logger.info('detecting paths for', self);
		while (true) {
			var match = jsioAddPath.exec(src);
			if (!match) { break; }
			logger.info('found path ' + match[1]);
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
		
		logger.info('detected', match[0])
		
		var cmd = match[1],
			inlineOpts = match[2] ? match[2].substring(1) : '';
		
		try {
			inlineOpts = eval(inlineOpts);
		} catch(e) {
			logger.warn('could not parse opts for jsio in', self + ':', inlineOpts);
			inlineOpts = {};
		}
		
		run(moduleDef.path, cmd, opts, inlineOpts);
	}
	
	jsioDynamic.lastIndex = 0;
	while(true) {
		var match = jsioDynamic.exec(moduleDef.src);
		if (!match) { break; }
		
		var cmd = match[1],
			inlineOpts = match[2] || '';
		
		if (opts.dynamicImports && cmd in opts.dynamicImports) {
			run(moduleDef.path, opts.dynamicImports[cmd], opts, inlineOpts);
		} else {
			logger.error('Missing: import definition\nConstant', cmd, 'for DYNAMIC_IMPORT_' + cmd, ' was not provided to the compiler');
		}
	}
	
	srcTable[moduleDef.filePath] = JS.shallowCopy(moduleDef);
	moduleDef.src = '';
}

exports.output = function(write, opts) {
	var opts = opts || {};
	if (!write) { write = jsio.__env.require('sys').print; }
	
	logger.info('building final output');

	if (opts.compress) {
		logger.info('compressing sources');
		compressTable(srcTable, opts);
	}

	var path = JS.shallowCopy(JSIO.__path);
	path.__default__ = [];
	
	var jsioSrc = ';(' + jsio.__jsio.__init__.toString(-1) + ')();'
			+ 'jsio.__path=' + JSON.stringify(path),
		strSrcTable = JSON.stringify(srcTable);

	// use a function to avoid having to do some crazy escaping of '$' in the replacement string!
	var src = jsioSrc.replace(sourceCache, function(match) { return "sourceCache=" + strSrcTable; });

	if (opts.compress) { src = compress(src, opts); }

	logger.info('writing output');
	
	write(src);
}

function compressTable(table, opts) {
	for (var i in table) {
		table[i].src = compress(table[i].src, opts);
	}
}

function run(path, cmd, opts, inlineOpts) {
	var newOpts = JS.merge({dontCompileJsio: true}, opts, inlineOpts);
	
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
	
	logger.info(path, cmd, newOpts);
	
	JSIO.__importer({}, path, cmd, newOpts);
}
