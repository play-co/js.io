jsio('from base import *');
var logger = logging.get('jsjsiocompiler');

var JSIO = 'jsio';

var supportedEnvs = {
	node: true,
	browser: true
};

var interface = null;

exports.start = function() {
	if (!jsio.__env.name in supportedEnvs) {
		logger.error("autostart failed: unknown environment.\n\n\tTry using compiler.run(args, opts) instead.");
		return;
	}
	
	var DYNAMIC_IMPORT_COMPILER = '.' + jsio.__env.name + '_interface';
	
	interface = jsio(DYNAMIC_IMPORT_COMPILER);
	
	// expects the interface to eventually call startWithOpts to do the actual compile
	interface.init(exports);
}

function getPackage(fileName) {
	try {
		var pkg = eval('(' + jsio.__env.fetch(fileName) + ')');
		logger.info('Package definition loaded from', fileName);
		return pkg;
	} catch(e) {
		logger.log(jsio.__env.getCwd())
		logger.warn('If "' + fileName + '" is a package file, it could not be read.', e);
	}
	return false;
}

/**
 * args : array of arguments
 *   - args[0] : string - initial import string (optional if opts.package is provided)
 * opts : object
 *   - package : string - filename of a package definition
 *   - debug : integer - debug level (1 - 4)
 */
exports.run = function(args, opts) {
	
	var debugLevel = 'debug' in opts ? opts.debug : 4;

	logger.setLevel(debugLevel);
	interface.logger.setLevel(debugLevel);
	logging.get('preprocessors.compiler').setLevel(debugLevel);
	
	if (debugLevel < 5) {
		var strOpts = JSON.stringify(opts, null, '\t');
		logger.info('Starting compiler with args: ', args, 'and options:', strOpts.substring(1, strOpts.length - 1));
	}
	
	var initial;
	
	// -- parse options --
	// try to maintain consistency with pyjsiocompile
	
	// accept a pkg file as the first argument
	if (/\.pkg$/.test(args[2])) {
		var pkg = getPackage(args[2]);

		// was it a valid pkg file?
		// (our test would also return true for "import foo.bar.pkg")
		if (pkg != false) {
			args.splice(2, 1); // consume the argument
			opts.package = pkg; // treat the package the same as if it was specified on the command line
		}
	}
	
	// opts.package is probably the filename of the package
	if (typeof opts.package == 'string' && /\.pkg$/.test(opts.package)) {
		opts.package = getPackage(opts.package);
	} 

	// parse the package contents
	if (opts.package) {
		var pkgDef = opts.package;
		
		// in pyjsiocompile, root does two things:
		if ('root' in pkgDef) {
			// 1. provide the initial import
			initial = pkgDef.root;

			// pyjsiocompile package files don't have a relative import indicator (a prefix dot: '.')
			// to indicate that the first import is relative, so manually add one here
			if (!/^\./.test(initial)) { initial = '.' + initial; }
			
			// 2. generate a statement to include at the bottom of the file
			opts.footer = (opts.footer || '') + JSIO + '("import ' + initial + '")';
		}
	

		// pyjsiocompile has keys for building the dynamic import ENV for the jsio net module.
		// All pairs of (environment, transport) should be included as dependencies.
		
		function extendArray(destKey, srcKey) {
			opts[destKey] = (opts[destKey] || []).concat(pkgDef[srcKey || destKey]);
		}
		
		function extendObject(destKey, srcKey) {
			opts[destKey] = JS.merge((opts[destKey] || {}), pkgDef[srcKey || destKey]);
		}
		
		if (pkgDef.environments) { extendArray('environments'); }
		if (pkgDef.transports) { extendArray('transports'); }
		
		// pyjsiocompile never supported additional dependencies, but the package files
		// have an empty key, so let's implement it anyway
		if (pkgDef.additional_dependancies) { extendArray('additionalDeps', 'additional_dependancies'); }

		// introduce new key 'dynamicImports' for handling dynamic import resolution
		//  -> a statement of jsio(DYNAMIC_IMPORT_foo) looks up 'foo' in the dynamicImports
		//     dictionary (each key maps to a string or array of strings)
		if (pkgDef.dynamicImports) { extendObject('dynamicImports'); }
	}
	
	// default argument is an import statement:
	//    jsio_compile "import .myModule"
	// (this will be args[2])
	// We do this after package resolution since the arguments on the
	// command-line should override any settings in the package file.
	if (args.length > 2) { initial = args[2]; }
	
	if (!initial) {
		interface.onError('No initial import specified');
		return;
	}
	
	// pyjsiocompile built the dynamic import table for the net environment
	// which depends on runtime environment and desired transports.  This
	// code does the same thing, building a list of imports that need to
	// happen upon import of the net.env module.  
	if (!opts.dynamicImports) { opts.dynamicImports = {}; }
	if (!opts.dynamicImports.ENV) { opts.dynamicImports.ENV = null; }
	if (opts.transports && opts.environments) {
		var ENV = opts.dynamicImports.ENV = opts.dynamicImports.ENV || [];
		for (var i = 0, numT = opts.transports.length; i < numT; ++i) {
			for (var j = 0, numE = opts.environments.length; j < numE; ++j) {
				opts.dynamicImports.ENV.push('import net.env.' + opts.environments[j] + '.' + opts.transports[i]);
			}
		}
	}
	
	// run the actual compiler
	var compiler = jsio('import preprocessors.compiler');
	compiler.compile('import base');
	
	if (opts.additionalDeps) {
		var deps = opts.additionalDeps,
			n = deps.length;
		logger.info('compiling dependencies...');
		for (var i = 0; i < n; ++i) {
			compiler.compile(deps[i]);
		}
	}
	
	logger.info('compiling main program', initial);
	compiler.compile(initial, {
		autoDetectPaths: true,
		dynamicImports: opts.dynamicImports
	});
	
	compiler.generateSrc(opts, function(src) {
		if (opts.footer) {
			src = src + (opts.footer || '');
		}
		interface.onFinish(opts, src);
	});
}
